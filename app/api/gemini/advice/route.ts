import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiUserMoods } from "@/lib/secure-data"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { getRandomAdvice } from "@/lib/ai-fallbacks"

// ─── Sistema: Coach Conductual (consejos de tarea) ────────────────────────────

const TASK_COACH_INSTRUCTION = `Eres un Coach Conductual de productividad personal. Tu rol es dar un consejo breve, específico y accionable para completar eficientemente la tarea del usuario.
Metodología: aplica la regla de 2 minutos, time blocking, y principios CBT para reducir la resistencia a iniciar.
Si el contexto indica estrés alto (≥ 4/10), incluye primero una observación empática y una técnica de manejo del estrés antes del consejo de productividad.
FORMATO: máximo 3 oraciones. Texto plano, sin markdown, en español. Sé motivador y concreto.`

export async function POST(request: NextRequest) {
  await ensureDbReady()

  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const { title, description, category, priority, duration, taskId } = body as {
      title: string
      description?: string
      category?: string
      priority?: string
      duration?: number
      taskId?: number | string
    }

    if (!title) {
      return NextResponse.json({ error: "El título de la tarea es requerido" }, { status: 400 })
    }

    const today = new Date().toISOString().split("T")[0]
    // Cache por tarea específica (taskId) o por categoría del día
    const cacheSubtype = taskId ? `task-${taskId}` : `${(category ?? "general").toLowerCase()}-${today}`
    const cacheKey = buildCacheKey("advice", cacheSubtype, today)

    // ── 1. Caché ──────────────────────────────────────────────────────────────
    const cached = await getCached(user.id, cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        advice: cached.response,
        source: "cache" as const,
        cachedAt: cached.cachedAt,
      })
    }

    // ── 2. Contexto de estado de ánimo del usuario ────────────────────────────
    let stressContext = ""
    try {
      const recentMoods = await getGeminiUserMoods(user.id, user.id, undefined, request)
      if (recentMoods.length > 0) {
        const last5 = recentMoods.slice(0, 5)
        const avgStress =
          last5.reduce((sum, m) => sum + ((m.stress as number) ?? 0), 0) / last5.length
        const avgEnergy =
          last5.reduce((sum, m) => sum + ((m.energy as number) ?? 0), 0) / last5.length

        if (avgStress >= 4) {
          stressContext = `\nCONTEXTO DE BIENESTAR: El usuario tiene un nivel de estrés elevado (promedio ${avgStress.toFixed(1)}/10) y energía de ${avgEnergy.toFixed(1)}/10. Aplica el protocolo de estrés.`
        } else {
          stressContext = `\nCONTEXTO: Energía reciente ${avgEnergy.toFixed(1)}/10, estrés ${avgStress.toFixed(1)}/10.`
        }
      }
    } catch {
      // El contexto de ánimo es opcional — no bloquea el consejo
    }

    // ── 3. Prompt contextualizado ─────────────────────────────────────────────
    const prompt = `Dame un consejo breve y práctico (máximo 3 oraciones) para completar eficientemente esta tarea:

Título: ${title}
${description ? `Descripción: ${description}` : ""}
Categoría: ${category ?? "general"}
Prioridad: ${priority ?? "normal"}
Tiempo estimado: ${duration ?? "no especificado"} minutos${stressContext}

El consejo debe ser específico para esta tarea, accionable y considerar el estado del usuario.`

    // ── 4. Llamar a Gemini con retry ──────────────────────────────────────────
    const apiKey = getGeminiApiKey()
    let advice: string

    try {
      const result = await callGeminiWithRetry(prompt, {
        apiKey,
        temperature: 0.7,
        maxOutputTokens: 256,
        systemInstruction: TASK_COACH_INSTRUCTION,
      })
      advice = result.text.trim()
    } catch (err) {
      // ── Fallback ──────────────────────────────────────────────────────────
      if (err instanceof GeminiRetryError) {
        await logFallback(user.id, "advice", err.reason, err.attempts)
      }
      return NextResponse.json({
        success: true,
        advice: getRandomAdvice(),
        source: "fallback" as const,
      })
    }

    // ── 5. Guardar en caché ───────────────────────────────────────────────────
    await setCached(user.id, cacheKey, advice, 24)

    return NextResponse.json({
      success: true,
      advice,
      source: "gemini" as const,
    })
  } catch (error) {
    console.error("[advice] Error:", error)
    return NextResponse.json({ error: "Error al generar consejo" }, { status: 500 })
  }
}
