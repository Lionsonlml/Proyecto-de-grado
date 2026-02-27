import { type NextRequest, NextResponse } from "next/server"
import { GEMINI_CONFIG, getGeminiApiKey } from "@/lib/gemini-config"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context, question } = body

    const apiKey = getGeminiApiKey()

    const prompt = `Contexto del usuario: ${JSON.stringify(context, null, 2)}\n\nPregunta: ${question}\n\nProporciona un insight breve y accionable basado en los datos del usuario.`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`,
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
      console.error("Error Gemini API insight:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const insightText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo generar insight"

    return NextResponse.json({ 
      success: true, 
      insight: insightText, 
      confidence: 85, 
      timestamp: new Date().toISOString() 
    })
  } catch (error) {
    console.error("Error en insight Gemini:", error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Error desconocido" 
    }, { status: 500 })
  }
}
