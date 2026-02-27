import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { getRandomMotivational } from "@/lib/ai-fallbacks"

export async function POST(request: NextRequest) {
  await ensureDbReady()

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const { energy, focus, stress, moodType } = body

    const currentEnergy = energy || 3
    const currentFocus = focus || 3
    const currentStress = stress || 3
    const currentMoodType = moodType || "neutral"

    // ── 2. Contexto descriptivo ───────────────────────────────────────────────
    let moodContext = ""
    switch (currentMoodType) {
      case "excelente":
        moodContext = "El usuario se siente excelente y muy motivado"
        break
      case "bien":
        moodContext = "El usuario se siente bien y productivo"
        break
      case "neutral":
        moodContext = "El usuario tiene un estado de ánimo neutral"
        break
      case "mal":
        moodContext = "El usuario se siente mal y necesita motivación"
        break
      case "muy-mal":
        moodContext = "El usuario se siente muy mal y necesita apoyo emocional"
        break
      default:
        if (currentEnergy >= 4 && currentStress <= 2) {
          moodContext = "El usuario se siente con mucha energía y poco estrés"
        } else if (currentEnergy <= 2 && currentStress >= 4) {
          moodContext = "El usuario se siente con poca energía y mucho estrés"
        } else if (currentFocus >= 4) {
          moodContext = "El usuario se siente muy enfocado"
        } else if (currentStress >= 4) {
          moodContext = "El usuario se siente estresado"
        } else {
          moodContext = "El usuario tiene un estado de ánimo neutral"
        }
    }

    // ── 3. Caché (TTL 4h por usuario + tipo de mood) ──────────────────────────
    const today = new Date().toISOString().split("T")[0]
    const cacheKey = buildCacheKey("motivational", currentMoodType, today)

    const cached = await getCached(user.id, cacheKey)
    if (cached) {
      return NextResponse.json({
        success: true,
        quote: cached.response,
        context: moodContext,
        source: "cache" as const,
        cachedAt: cached.cachedAt,
      })
    }

    // ── 4. Llamar a Gemini con retry ──────────────────────────────────────────
    const prompt = `Eres un coach motivacional experto. Genera una frase motivacional corta y personalizada (máximo 15 palabras) basada en el estado actual del usuario:

Contexto: ${moodContext}
Tipo de mood: ${currentMoodType}
Energía: ${currentEnergy}/5 · Enfoque: ${currentFocus}/5 · Estrés: ${currentStress}/5

Reglas: motivacional, positiva, máximo 15 palabras, en español, sin markdown, sin comillas.
Genera UNA sola frase.`

    let quote: string
    const apiKey = getGeminiApiKey()

    try {
      const result = await callGeminiWithRetry(prompt, {
        apiKey,
        temperature: 0.8,
        maxOutputTokens: 128,
      })
      quote = result.text.trim().replace(/^["']|["']$/g, "")
    } catch (err) {
      // ── Fallback: Gemini no disponible ────────────────────────────────────
      if (err instanceof GeminiRetryError) {
        await logFallback(user.id, "motivational", err.reason, err.attempts)
      }
      return NextResponse.json({
        success: true,
        quote: getRandomMotivational(),
        context: moodContext,
        source: "fallback" as const,
      })
    }

    // ── 5. Guardar en caché 4h ────────────────────────────────────────────────
    await setCached(user.id, cacheKey, quote, 4)

    return NextResponse.json({
      success: true,
      quote,
      context: moodContext,
      source: "gemini" as const,
    })
  } catch (error) {
    console.error("[motivational] Error:", error)
    return NextResponse.json({ error: "Error al generar frase motivacional" }, { status: 500 })
  }
}
