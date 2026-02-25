import { NextResponse, type NextRequest } from "next/server"
import { GEMINI_CONFIG, getGeminiApiKey } from '@/lib/gemini-config'

export async function POST(request: NextRequest) {
  try {
    const apiKey = getGeminiApiKey()

    const body = await request.json()
    const { title, description, category, priority, duration } = body

    const prompt = `Eres un asistente de productividad experto. Dame un consejo breve y práctico (máximo 2-3 oraciones) para completar eficientemente la siguiente tarea:

Título: ${title}
${description ? `Descripción: ${description}` : ''}
Categoría: ${category}
Prioridad: ${priority}
Tiempo estimado: ${duration || 'No especificado'} minutos

El consejo debe ser específico, accionable y motivador. No uses formato markdown, solo texto plano.`

    // Usar REST API directa con v1 (no GoogleGenerativeAI que usa v1beta)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`,
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
      console.error("Error de Gemini API:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const advice = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Error al obtener consejo"

    return NextResponse.json({ success: true, advice })
  } catch (error: any) {
    const rawMsg = error?.message || String(error)
    const redactedMsg = rawMsg.replace(/AIza[0-9A-Za-z-_]+/g, '[REDACTED_API_KEY]')
    console.error("Error generando consejo:", redactedMsg)

    if (rawMsg.includes('not found') || rawMsg.includes('is not found')) {
      return NextResponse.json(
        { error: `Modelo no disponible. Revisa GEMINI_CONFIG.model.` },
        { status: 502 }
      )
    }

    return NextResponse.json(
      { error: "Error al generar consejo", details: redactedMsg },
      { status: 500 }
    )
  }
}


