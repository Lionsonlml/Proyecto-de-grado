import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiUserTasks, getGeminiUserMoods } from "@/lib/secure-data"
import { GEMINI_CONFIG, getGeminiApiKey } from "@/lib/gemini-config"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { date } = await request.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // Obtener TODAS las tareas del usuario (no filtrar por fecha) y todos los moods
    const [allTasks, allMoods] = await Promise.all([
      getGeminiUserTasks(user.id, user.id, undefined, request), // Sin filtro de fecha para obtener todas
      getGeminiUserMoods(user.id, user.id, undefined, request),  // Sin filtro de fecha
    ])

    console.log(`📊 Optimización - Tareas totales: ${allTasks.length}, Moods: ${allMoods.length}`)

    const apiKey = getGeminiApiKey()
    
    // Filtrar solo tareas pendientes
    const pendingTasks = allTasks.filter((t: any) => !t.completed)
    
    console.log(`📋 Tareas pendientes para optimizar: ${pendingTasks.length}`)
    
    if (pendingTasks.length === 0) {
      return NextResponse.json({
        error: "No hay tareas pendientes para optimizar",
        suggestion: "Crea algunas tareas primero en la sección de Tareas",
      }, { status: 400 })
    }
    
    const tasksSummary = pendingTasks.map((t: any) => 
      `- ${t.title} (${t.duration || 60}min)`
    ).join('\n')
    
    const moodsSummary = allMoods.slice(0, 10).map((m: any) => 
      `- Hora ${m.hour}: ${m.type}, energía ${m.energy}/10`
    ).join('\n')

    const prompt = `Eres un asistente de productividad. Crea un horario optimizado para hoy (${targetDate}) con estas tareas:

TAREAS PENDIENTES:
${tasksSummary}

PATRONES DE ENERGÍA HISTÓRICOS:
${moodsSummary}

Asigna cada tarea al mejor horario (entre 08:00 y 22:00) según:
1. Los niveles de energía del usuario
2. La duración de cada tarea
3. Las horas más productivas detectadas

Responde SOLO con este JSON exacto (sin markdown):
{
  "schedule": [
    {"time": "09:00", "task": "nombre tarea exacto", "duration": 60, "reason": "explicación breve"}
  ]
}`

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
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    console.log("📝 Respuesta de Gemini length:", responseText.length)
    console.log("📝 Preview:", responseText.substring(0, 200))

    if (!responseText) {
      console.error("❌ Respuesta vacía de Gemini")
      return NextResponse.json({
        error: "El modelo no generó respuesta",
        finishReason: geminiData.candidates?.[0]?.finishReason,
      }, { status: 400 })
    }

    let parsedSchedule: any = null
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : responseText
      parsedSchedule = JSON.parse(jsonStr)
      console.log("✅ Schedule parseado:", parsedSchedule.schedule?.length || 0, "items")
    } catch (e) {
      console.error("❌ Error parseando JSON:", e)
      console.error("❌ Text que intentó parsear:", responseText.substring(0, 500))
      return NextResponse.json({ 
        error: "Error parseando respuesta del modelo",
        responsePreview: responseText.substring(0, 200),
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      originalTasks: allTasks,
      pendingTasks,
      optimizedSchedule: parsedSchedule.schedule || [],
      response: responseText,
      date: targetDate,
    })
  } catch (error) {
    console.error("Error optimizando horario:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error desconocido" }, { status: 500 })
  }
}

