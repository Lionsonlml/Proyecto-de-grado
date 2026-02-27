import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiUserTasks, getGeminiUserMoods, saveSecureInsight } from "@/lib/secure-data"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { FALLBACK_SCHEDULE } from "@/lib/ai-fallbacks"

// ─── Sistema: Coach de Planificación ─────────────────────────────────────────

const SCHEDULE_COACH_INSTRUCTION = `Eres un Coach de Planificación de productividad personal. Creas horarios optimizados usando:
• Ventana de máxima energía del usuario (detectada desde su historial de moods).
• Time Blocking: bloques continuos por tipo de tarea, minimizando cambios de contexto.
• Principio de Pareto: las tareas de mayor impacto van en el bloque de mayor energía.
• Descansos cognitivos: no más de 90 minutos de trabajo profundo sin pausa.
CRÍTICO: En el campo "task" del JSON debes usar el nombre EXACTAMENTE igual a como aparece en la lista de tareas. NO inventes tareas nuevas. NO parafrasees. Copia el texto literal.
FORMATO: responde SOLO con JSON válido sin markdown. Si el estrés promedio ≥ 4/5, agrega un bloque de descanso al inicio del día.`

export async function POST(request: NextRequest) {
  await ensureDbReady()

  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { date } = await request.json()
    const targetDate = date || new Date().toISOString().split("T")[0]

    const cacheKey = buildCacheKey("schedule", "optimize", targetDate)

    // ── 1. Caché ──────────────────────────────────────────────────────────────
    const cached = await getCached(user.id, cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached.response)
        return NextResponse.json({
          success: true,
          ...parsed,
          source: "cache" as const,
          cachedAt: cached.cachedAt,
        })
      } catch {
        // cache corrupto → continuar con Gemini
      }
    }

    // ── 2. Datos — priorizar tareas del día seleccionado, fallback a todas las pendientes ──
    const [tasksForDate, allMoods] = await Promise.all([
      getGeminiUserTasks(user.id, user.id, targetDate, request),
      getGeminiUserMoods(user.id, user.id, undefined, request),
    ])

    // Si no hay tareas para la fecha, obtener todas las pendientes
    let allTasks: any[] = tasksForDate as any[]
    if (allTasks.filter((t: any) => !t.completed).length === 0) {
      const allPending = await getGeminiUserTasks(user.id, user.id, undefined, request)
      allTasks = allPending as any[]
    }

    const pendingTasks = allTasks.filter((t: any) => !t.completed && t.status !== "cancelada")

    if (pendingTasks.length === 0) {
      return NextResponse.json({
        error: "No hay tareas pendientes para optimizar",
        suggestion: "Crea algunas tareas primero en la sección de Tareas",
      }, { status: 400 })
    }

    // Calcular ventana de rendimiento pico
    const hourStats: Record<number, number[]> = {}
    for (const mood of allMoods as any[]) {
      if (mood.hour == null) continue
      const h = mood.hour as number
      if (!hourStats[h]) hourStats[h] = []
      hourStats[h].push((mood.energy ?? 0) + (mood.focus ?? 0))
    }
    const peakHour = Object.entries(hourStats)
      .map(([h, scores]) => ({
        hour: parseInt(h),
        score: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => b.score - a.score)[0]

    const avgStress =
      (allMoods as any[]).length > 0
        ? (allMoods as any[]).reduce((sum, m) => sum + (m.stress ?? 0), 0) / (allMoods as any[]).length
        : 0

    const stressNote =
      avgStress >= 4
        ? `\n⚠️ ALERTA: Estrés promedio ${avgStress.toFixed(1)}/10 — agrega un bloque de descanso/bienestar al inicio.`
        : ""

    const peakInfo = peakHour
      ? `~${peakHour.hour}:00h (score energía+foco: ${peakHour.score.toFixed(1)}/10)`
      : "no determinada"

    const tasksSummary = pendingTasks
      .map((t: any, i: number) =>
        `  ${i + 1}. "${t.title ?? "(sin título)"}" — ${t.duration ?? 60}min | ${t.category ?? "?"} | ${t.priority ?? "normal"} prioridad`
      )
      .join("\n")

    const moodsSummary = (allMoods as any[])
      .slice(0, 10)
      .map((m: any) => `  [${m.date ?? "?"} ${m.hour ?? "?"}h] energía:${m.energy ?? 0} foco:${m.focus ?? 0} estrés:${m.stress ?? 0}`)
      .join("\n")

    const prompt = `VENTANA DE RENDIMIENTO PICO DEL USUARIO: ${peakInfo}
Tareas pendientes: ${pendingTasks.length}${stressNote}

LISTA EXACTA DE TAREAS A PROGRAMAR (usa los títulos literalmente, entre comillas):
${tasksSummary}

HISTORIAL DE ENERGÍA/FOCO (referencia):
${moodsSummary || "  • Sin datos de historial"}

Crea un horario para el día ${targetDate} entre las 08:00 y 22:00.
REGLAS OBLIGATORIAS:
1. El campo "task" debe ser el título EXACTO de una tarea de la lista anterior (sin modificar).
2. NO agregues tareas que no estén en la lista. NO inventes actividades.
3. Coloca tareas de mayor prioridad en la ventana de rendimiento pico (${peakInfo}).
4. No excedas 90min de trabajo continuo sin descanso.

Responde SOLO con este JSON (sin markdown):
{
  "schedule": [
    {"time": "09:00", "task": "título exacto de la tarea", "duration": 60, "reason": "por qué este horario basado en datos del usuario"}
  ]
}`

    // ── 3. Llamar a Gemini con retry ──────────────────────────────────────────
    const apiKey = getGeminiApiKey()
    let responseText: string

    try {
      const result = await callGeminiWithRetry(prompt, {
        apiKey,
        temperature: 0.5,
        systemInstruction: SCHEDULE_COACH_INSTRUCTION,
      })
      responseText = result.text
    } catch (err) {
      // ── Fallback ──────────────────────────────────────────────────────────
      if (err instanceof GeminiRetryError) {
        await logFallback(user.id, "schedule:optimize", err.reason, err.attempts)
      }
      return NextResponse.json({
        success: true,
        originalTasks: allTasks,
        pendingTasks,
        optimizedSchedule: FALLBACK_SCHEDULE.schedule,
        source: "fallback" as const,
      })
    }

    // ── 4. Parsear respuesta ───────────────────────────────────────────────────
    let parsedSchedule: any = null
    try {
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : responseText
      parsedSchedule = JSON.parse(jsonStr)
    } catch {
      // Respuesta no parseable → fallback
      await logFallback(user.id, "schedule:optimize", "JSON parse error", 1)
      return NextResponse.json({
        success: true,
        originalTasks: allTasks,
        pendingTasks,
        optimizedSchedule: FALLBACK_SCHEDULE.schedule,
        source: "fallback" as const,
      })
    }

    // ── 5. Guardar en caché ───────────────────────────────────────────────────
    const cachePayload = JSON.stringify({
      originalTasks: allTasks,
      pendingTasks,
      optimizedSchedule: parsedSchedule.schedule ?? [],
      date: targetDate,
    })
    await setCached(user.id, cacheKey, cachePayload)

    // ── 6. Persistir en ai_insights (fire-and-forget) ─────────────────────────
    saveSecureInsight(
      user.id,
      {
        prompt: `Horario optimizado para ${targetDate}`,
        response: JSON.stringify(parsedSchedule.schedule ?? []),
        analysis_type: "schedule:optimize",
        metadata: JSON.stringify({ date: targetDate, taskCount: pendingTasks.length }),
      },
      request
    ).catch(() => {})

    if (process.env.NODE_ENV !== "production") {
      console.log(`[schedule:optimize] ${targetDate} | pending:${pendingTasks.length} | peak:${peakHour?.hour ?? "?"}h | stress:${avgStress.toFixed(1)}`)
    }

    return NextResponse.json({
      success: true,
      originalTasks: allTasks,
      pendingTasks,
      optimizedSchedule: parsedSchedule.schedule ?? [],
      response: responseText,
      date: targetDate,
      source: "gemini" as const,
    })
  } catch (error) {
    console.error("[schedule:optimize] Error:", error)
    return NextResponse.json({ error: "Error optimizando horario" }, { status: 500 })
  }
}
