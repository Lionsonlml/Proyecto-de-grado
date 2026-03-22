import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { callGeminiWithRetry } from "@/lib/gemini-caller"

export async function POST(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  const { title, description, mode } = await request.json()
  // mode: 'suggest' (optimizar) o 'decompose' (desglosar en subtareas)

  if (!title) return NextResponse.json({ error: "Título requerido" }, { status: 400 })

  const prompt = mode === 'decompose'
    ? `Desglosa esta tarea en 3-5 subtareas concretas y accionables.
Tarea: "${title}"
${description ? `Descripción: "${description}"` : ''}
Responde SOLO con JSON válido:
{"subtasks": [{"title": "subtarea 1"}, {"title": "subtarea 2"}, ...]}`
    : `Analiza esta tarea y sugiere:
Tarea: "${title}"
${description ? `Descripción: "${description}"` : ''}
Responde SOLO con JSON válido:
{
  "estimatedMinutes": 60,
  "priority": "media",
  "tags": ["tag1", "tag2"],
  "reasoning": "breve explicación"
}`

  try {
    const apiKey = getGeminiApiKey()
    const result = await callGeminiWithRetry(prompt, { apiKey, temperature: 0.3 })
    const text = result.text

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : text
    const parsed = JSON.parse(jsonStr)

    return NextResponse.json({ success: true, ...parsed, source: 'gemini' })
  } catch {
    if (mode === 'decompose') {
      return NextResponse.json({
        success: true,
        subtasks: [
          { title: `Planificar: ${title}` },
          { title: `Ejecutar: ${title}` },
          { title: `Revisar: ${title}` },
        ],
        source: 'fallback'
      })
    }
    return NextResponse.json({
      success: true,
      estimatedMinutes: 60,
      priority: 'media',
      tags: [],
      reasoning: 'Sugerencias por defecto (sin API de IA)',
      source: 'fallback'
    })
  }
}
