import { NextResponse, type NextRequest } from "next/server"
import { GEMINI_CONFIG, getGeminiApiKey } from '@/lib/gemini-config'

export async function POST(request: NextRequest) {
  // Obtener modelo al inicio para usarlo en error handling
  const modelName = GEMINI_CONFIG?.model || 'gemini-1.5-flash'
  
  try {
    const apiKey = getGeminiApiKey()

    const body = await request.json()
    const { recentMoods, energy, focus, stress, moodType } = body

    // Analizar el último estado registrado del usuario
    const currentEnergy = energy || 3
    const currentFocus = focus || 3
    const currentStress = stress || 3
    const currentMoodType = moodType || "neutral"

    let moodContext = ""
    
    // Contexto basado en el tipo de mood específico
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
        // Fallback basado en métricas numéricas
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

    const prompt = `Eres un coach motivacional experto. Genera una frase motivacional corta y personalizada (máximo 15 palabras) basada en el último estado registrado del usuario:

Contexto del usuario: ${moodContext}
Tipo de mood: ${currentMoodType}
Energía actual: ${currentEnergy}/5
Enfoque actual: ${currentFocus}/5
Estrés actual: ${currentStress}/5

La frase debe ser:
- Motivacional y positiva
- Corta (máximo 15 palabras)
- Apropiada para el estado actual específico del usuario
- En español
- Sin formato markdown, solo texto plano
- Considera el tipo de mood específico (${currentMoodType})

Genera UNA sola frase motivacional.`

    // Usar REST API directa con v1 (no GoogleGenerativeAI que usa v1beta)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: GEMINI_CONFIG.generationConfig,
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("Error Gemini API motivational:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const motivationalQuote = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "¡Tú puedes lograrlo!"

    return NextResponse.json({ 
      success: true, 
      quote: motivationalQuote,
      context: moodContext
    })
  } catch (error: any) {
    const rawMsg = error?.message || String(error)
    const redactedMsg = rawMsg.replace(/AIza[0-9A-Za-z-_]+/g, '[REDACTED_API_KEY]')
    console.error('Error generando frase motivacional:', redactedMsg)

    if (rawMsg.includes('Permission denied') || rawMsg.includes('CONSUMER_SUSPENDED') || error?.status === 403) {
      return NextResponse.json(
        { error: 'Clave de Gemini inválida o suspendida. Revisa la variable de entorno GEMINI_API_KEY.' },
        { status: 503 }
      )
    }

    if (rawMsg.includes('not found') || rawMsg.includes('is not found')) {
      return NextResponse.json(
        { error: `Modelo no disponible (${modelName}). Revisa GEMINI_CONFIG.model o la versión de la API.` },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: 'Error al generar frase motivacional', details: redactedMsg },
      { status: 500 }
    )
  }
}

