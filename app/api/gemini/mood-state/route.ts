import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { getGeminiUserMoods } from "@/lib/secure-data"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOOD_VALUES: Record<string, number> = {
  "muy-mal": 1, "mal": 2, "neutral": 3, "bien": 4, "excelente": 5,
}

function normalizeMoodType(raw: string): string {
  const t = (raw || "neutral").toLowerCase()
  if (t.includes("muy-mal") || t === "muy-mal") return "muy-mal"
  if (t.includes("excelente") || t.includes("enfocado") || t.includes("energético") || t.includes("peak")) return "excelente"
  if (t.includes("bien") || t.includes("productivo") || t.includes("motivado")) return "bien"
  if (t.includes("mal") || t.includes("cansado") || t.includes("lento") || t.includes("agotado") || t.includes("estresado")) return "mal"
  if (t.includes("muy")) return "muy-mal"
  return "neutral"
}

function buildHeuristicFallback(s: {
  avgMood: number; avgEnergy: number; avgFocus: number; avgStress: number
  trend: number; count: number
}): string {
  const moodLabel = s.avgMood >= 4.5 ? "muy positivo"
    : s.avgMood >= 3.5 ? "positivo"
    : s.avgMood >= 2.5 ? "neutral"
    : s.avgMood >= 1.5 ? "bajo"
    : "muy bajo"

  const trendText = s.trend > 0.15 ? "con tendencia al alza"
    : s.trend < -0.15 ? "con tendencia a la baja"
    : "estable"

  let context = ""
  if (s.avgStress >= 4) {
    context = "Tu nivel de estrés ha estado alto — considera incorporar pausas o respiración consciente."
  } else if (s.avgEnergy <= 2) {
    context = "Tu energía promedio ha estado baja — revisa sueño y alimentación."
  } else if (s.avgFocus >= 4 && s.avgStress <= 2) {
    context = "Estás en un buen momento de productividad y calma — buen ritmo para trabajo profundo."
  } else if (s.avgEnergy >= 4 && s.avgFocus >= 4) {
    context = "Tu energía y concentración están altas — aprovecha para tareas exigentes."
  } else {
    context = "Mantén el registro diario para detectar mejor tus patrones."
  }

  return `Tu estado emocional promedio de los últimos ${s.count} registros es ${moodLabel} ${trendText}. ${context}`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  await ensureDbReady()

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    // Leer flag force del body (opcional) para bypass de caché
    const body = await request.json().catch(() => ({}))
    const force = body?.force === true

    // ── 2. Obtener moods recientes (descifrados, plano) ───────────────────
    const allMoods = await getGeminiUserMoods(user.id, user.id, undefined, request)
    const moods = allMoods.slice(0, 10) // los 10 más recientes (orden DESC en BD)

    if (moods.length === 0) {
      return NextResponse.json({
        success: true,
        state: "Aún no tienes registros de estado de ánimo. Empieza por registrar cómo te sientes para descubrir tus patrones.",
        summary: { avgMood: 0, avgEnergy: 0, avgFocus: 0, avgStress: 0, trend: 0, count: 0 },
        source: "empty" as const,
      })
    }

    // ── 3. Calcular promedios y tendencia ─────────────────────────────────
    const moodNums = moods.map(m => MOOD_VALUES[normalizeMoodType(m.type)] ?? 3)
    const avgMood   = +(moodNums.reduce((a, b) => a + b, 0) / moodNums.length).toFixed(2)
    const avgEnergy = +(moods.reduce((s, m) => s + (Number(m.energy) || 0), 0) / moods.length).toFixed(2)
    const avgFocus  = +(moods.reduce((s, m) => s + (Number(m.focus)  || 0), 0) / moods.length).toFixed(2)
    const avgStress = +(moods.reduce((s, m) => s + (Number(m.stress) || 0), 0) / moods.length).toFixed(2)

    // Tendencia: regresión lineal simple sobre orden cronológico (más antiguo → reciente)
    const chronological = [...moodNums].reverse()
    const trend = (() => {
      const n = chronological.length
      if (n < 3) return 0
      const sumX  = (n * (n - 1)) / 2
      const sumY  = chronological.reduce((a, b) => a + b, 0)
      const sumXY = chronological.reduce((a, b, i) => a + i * b, 0)
      const sumXX = (n * (n - 1) * (2 * n - 1)) / 6
      const denom = n * sumXX - sumX * sumX
      if (denom === 0) return 0
      return +((n * sumXY - sumX * sumY) / denom).toFixed(3)
    })()

    const summary = {
      avgMood, avgEnergy, avgFocus, avgStress, trend,
      count: moods.length,
    }

    // ── 4. Cache (TTL 4h, key incluye promedios redondeados para auto-refresh
    //          cuando los datos cambian sustancialmente) ────────────────────
    const today = new Date().toISOString().split("T")[0]
    const cacheSubKey = `${avgMood.toFixed(1)}-${avgEnergy.toFixed(1)}-${avgFocus.toFixed(1)}-${avgStress.toFixed(1)}-${moods.length}`
    const cacheKey = buildCacheKey("mood-state", cacheSubKey, today)

    // Si force=true, omitir caché y forzar llamada nueva a Gemini
    if (!force) {
      const cached = await getCached(user.id, cacheKey)
      if (cached) {
        return NextResponse.json({
          success: true,
          state: cached.response,
          summary,
          source: "cache" as const,
          cachedAt: cached.cachedAt,
        })
      }
    }

    // ── 5. Construir prompt y llamar a Gemini ─────────────────────────────
    const recentList = moods.slice(0, 5).map((m, i) => {
      const tag = i === 0 ? "más reciente" : `hace ${i + 1}º`
      return `(${tag}) ${m.type}, energía ${m.energy}/5, concentración ${m.focus}/5, estrés ${m.stress}/5`
    }).join("\n")

    const trendText = trend > 0.15 ? "alza" : trend < -0.15 ? "baja" : "estable"

    const prompt = `Eres un coach empático en bienestar emocional. Analiza el estado del usuario y describe SU ESTADO EMOCIONAL ACTUAL en exactamente 2-3 frases breves, cálidas y útiles. NO uses palabras técnicas ni clínicas. NO repitas los números.

Datos (últimos ${moods.length} registros):
- Promedios: ánimo ${avgMood}/5 · energía ${avgEnergy}/5 · concentración ${avgFocus}/5 · estrés ${avgStress}/5
- Tendencia: ${trendText}
- Registros recientes:
${recentList}

Reglas estrictas:
- Máximo 3 frases.
- Tono empático, no clínico, en español.
- Termina con UNA observación o sugerencia accionable concreta.
- Sin markdown, sin emojis, sin comillas.
- Habla en segunda persona ("estás", "te").`

    const apiKey = getGeminiApiKey()
    let state: string

    try {
      const result = await callGeminiWithRetry(prompt, {
        apiKey,
        temperature: 0.7,
        maxOutputTokens: 256,
      })
      state = result.text.trim().replace(/^["']|["']$/g, "")
    } catch (err) {
      if (err instanceof GeminiRetryError) {
        await logFallback(user.id, "mood-state", err.reason, err.attempts)
      }
      return NextResponse.json({
        success: true,
        state: buildHeuristicFallback(summary),
        summary,
        source: "fallback" as const,
      })
    }

    // ── 6. Guardar en caché 4h ────────────────────────────────────────────
    await setCached(user.id, cacheKey, state, 4)

    return NextResponse.json({
      success: true,
      state,
      summary,
      source: "gemini" as const,
    })
  } catch (error) {
    console.error("[mood-state] Error:", error)
    return NextResponse.json({ error: "Error al analizar estado emocional" }, { status: 500 })
  }
}
