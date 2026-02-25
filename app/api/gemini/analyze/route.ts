import { type NextRequest, NextResponse } from "next/server"
import { GEMINI_CONFIG, getGeminiApiKey } from "@/lib/gemini-config"
import { verifyToken, saveGeminiInsight } from "@/lib/auth"
import { getGeminiUserTasks, getGeminiUserMoods } from "@/lib/secure-data"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const { analysisType = "patterns", date } = body as {
      analysisType?: "patterns" | "schedule" | "recommendations"
      date?: string
    }

    const apiKey = getGeminiApiKey()

    // SOLO datos de la base de datos SIN encriptación para Gemini
    const [dbTasks, dbMoods] = await Promise.all([
      getGeminiUserTasks(user.id, user.id, date, request),
      getGeminiUserMoods(user.id, user.id, date, request),
    ])

    console.log(`📊 Datos de BD - Tareas: ${dbTasks.length}, Moods: ${dbMoods.length}`)

    const allTasks = dbTasks
    const allMoods = dbMoods

    // Construir resumen de datos para el prompt
    const tasksSummary = allTasks.map((t: any) => 
      `- ${t.title} (${t.duration}min, hora: ${t.hour || 'sin asignar'}, completada: ${t.completed ? 'sí' : 'no'})`
    ).join('\n')
    
    const moodsSummary = allMoods.map((m: any) =>
      `- Hora ${m.hour}: ${m.type}, energía ${m.energy}/10`
    ).join('\n')

    let prompt = ""
    if (analysisType === "patterns") {
      prompt = `Eres un asistente de productividad. Analiza estos datos y responde en JSON:

TAREAS:
${tasksSummary}

ESTADOS DE ÁNIMO:
${moodsSummary}

Responde con este JSON exacto:
{
  "patterns": ["patrón 1", "patrón 2"],
  "optimal_times": {"mañana": "descripción", "tarde": "descripción"},
  "correlations": ["correlación 1"]
}`
    } else if (analysisType === "recommendations") {
      prompt = `Eres un asistente de productividad. Basándote en:

TAREAS:
${tasksSummary}

MOODS:
${moodsSummary}

Genera 3-5 recomendaciones personalizadas. Responde con este JSON exacto:
{
  "recommendations": ["recomendación 1", "recomendación 2"]
}`
    } else {
      const pendingTasks = allTasks.filter((t: any) => !t.completed)
      const pendingSummary = pendingTasks.map((t: any) => `- ${t.title} (${t.duration}min)`).join('\n')
      
      prompt = `Eres un asistente de productividad. Crea un horario optimizado para estas tareas:

TAREAS PENDIENTES:
${pendingSummary}

PATRONES DE ENERGÍA:
${moodsSummary}

Responde con este JSON exacto:
{
  "schedule": [{"time": "09:00", "task": "nombre", "reason": "explicación"}]
}`
    }

    const startedAt = Date.now()
    
    // Llamar directamente a la API REST de Gemini
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
    
    const durationMs = Date.now() - startedAt

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("❌ Error de Gemini API:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    
    // Verificar si la respuesta fue bloqueada
    if (geminiData.promptFeedback?.blockReason) {
      console.error("❌ Respuesta bloqueada:", geminiData.promptFeedback.blockReason)
      console.error("❌ Safety ratings:", geminiData.promptFeedback?.safetyRatings)
      return NextResponse.json({ 
        error: `Respuesta bloqueada por safety filters: ${geminiData.promptFeedback.blockReason}`,
        blocked: true,
      }, { status: 400 })
    }
    
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""
    
    console.log("📝 Response length:", responseText.length)
    
    if (!responseText) {
      console.error("❌ Respuesta vacía")
      console.error("❌ Candidates exists:", !!geminiData.candidates)
      console.error("❌ Candidate[0]:", geminiData.candidates?.[0])
      console.error("❌ finishReason:", geminiData.candidates?.[0]?.finishReason)
      console.error("❌ safetyRatings:", geminiData.candidates?.[0]?.safetyRatings)
      
      return NextResponse.json({
        error: "El modelo no generó respuesta. Posible bloqueo por safety filters.",
        finishReason: geminiData.candidates?.[0]?.finishReason,
        safetyRatings: geminiData.candidates?.[0]?.safetyRatings,
      }, { status: 400 })
    }
    
    console.log("✅ Response OK:", responseText.substring(0, 200))

    let parsed: unknown = null
    try {
      // Intentar extraer JSON de la respuesta (puede venir con markdown)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = null
    }

    await saveGeminiInsight(user.id, prompt, responseText, analysisType)

    return NextResponse.json({
      success: true,
      model: GEMINI_CONFIG.model,
      analysisType,
      prompt,
      response: responseText,
      parsed,
      stats: {
        date: date || "all",
        counts: {
          tasks: dbTasks.length,
          moods: dbMoods.length,
        },
        source: "database",
      },
      durationMs,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error en análisis Gemini:\n", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}
