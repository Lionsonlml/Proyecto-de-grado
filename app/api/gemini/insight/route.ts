import { type NextRequest, NextResponse } from "next/server"
import { GEMINI_CONFIG, getGeminiApiKey } from "@/lib/gemini-config"
import { GoogleGenerativeAI } from "@google/generative-ai"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context, question } = body

    const apiKey = getGeminiApiKey()
    const genAI = new GoogleGenerativeAI(apiKey, { apiVersion: "v1" })
    const model = genAI.getGenerativeModel({ model: GEMINI_CONFIG.model, generationConfig: GEMINI_CONFIG.generationConfig })

    const prompt = `Contexto del usuario: ${JSON.stringify(context, null, 2)}\n\nPregunta: ${question}\n\nProporciona un insight breve y accionable basado en los datos del usuario.`

    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] })
    const text = result.response.text()

    return NextResponse.json({ success: true, insight: text, confidence: 85, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error("Error en insight Gemini:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}
