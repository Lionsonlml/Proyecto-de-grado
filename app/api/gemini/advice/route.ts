import { NextResponse, type NextRequest } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: "API key no configurada" }, { status: 500 })
    }

    const body = await request.json()
    const { title, description, category, priority, duration } = body

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
    })

    const prompt = `Eres un asistente de productividad experto. Dame un consejo breve y práctico (máximo 2-3 oraciones) para completar eficientemente la siguiente tarea:

Título: ${title}
${description ? `Descripción: ${description}` : ''}
Categoría: ${category}
Prioridad: ${priority}
Tiempo estimado: ${duration || 'No especificado'} minutos

El consejo debe ser específico, accionable y motivador. No uses formato markdown, solo texto plano.`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const advice = response.text().trim()

    return NextResponse.json({ success: true, advice })
  } catch (error: any) {
    console.error("Error generando consejo:", error)
    return NextResponse.json(
      { error: "Error al generar consejo", details: error.message },
      { status: 500 }
    )
  }
}


