import { NextResponse, type NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key no configurada" }, { status: 500 })
    }

    const body = await request.json()
    const { recentMoods, energy, focus, stress, moodType } = body

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
    })

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

    const result = await model.generateContent(prompt)
    const response = await result.response
    const motivationalQuote = response.text().trim()

    return NextResponse.json({ 
      success: true, 
      quote: motivationalQuote,
      context: moodContext
    })
  } catch (error: any) {
    console.error("Error generando frase motivacional:", error)
    return NextResponse.json(
      { error: "Error al generar frase motivacional", details: error.message },
      { status: 500 }
    )
  }
}
