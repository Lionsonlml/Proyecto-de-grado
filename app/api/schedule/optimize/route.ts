import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiUserTasks, getGeminiUserMoods, saveSecureInsight } from "@/lib/secure-data"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { FALLBACK_SCHEDULE } from "@/lib/ai-fallbacks"

// ─── Sistema: Coach de Planificación ─────────────────────────────────────────

const SCHEDULE_COACH_INSTRUCTION = `Eres un Coach de Planificación de productividad personal. Creas horarios optimizados basándote en:
• Ventana de máxima energía del usuario (detectada desde su historial de moods).
• Time Blocking: un bloque por tarea, sin subdividir una tarea en múltiples entradas.
• Principio de Pareto: tareas de mayor prioridad en la ventana de mayor energía.

REGLAS DE HORARIO:
• Reuniones, trámites, compras y actividades en lugares físicos: solo entre 07:00 y 20:00.
• Trabajo digital, estudio: entre 06:00 y 23:00.
• Ejercicio: entre 06:00 y 21:00.
• Nada entre 00:00 y 05:59.
• Solo añadir UN descanso de 30min si el total de trabajo supera 4 horas. No más.

CRÍTICO: Cada tarea aparece UNA SOLA VEZ en el horario. No la repitas ni la dividas.
En "task" copia el título EXACTAMENTE como aparece en la lista. NO inventes tareas nuevas.
FORMATO: responde SOLO con JSON válido, sin markdown ni texto extra.`

export async function POST(request: NextRequest) {
  await ensureDbReady()

  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { date, force } = await request.json()
    const targetDate = date || new Date().toISOString().split("T")[0]

    const cacheKey = buildCacheKey("schedule", "optimize", targetDate)

    // ── 1. Caché (se omite si force=true) ────────────────────────────────────
    if (!force) {
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
    }

    // ── 2. Datos — SIEMPRE usar todas las tareas pendientes del usuario ───────
    const [allTasksRaw, allMoods] = await Promise.all([
      getGeminiUserTasks(user.id, user.id, undefined, request),
      getGeminiUserMoods(user.id, user.id, undefined, request),
    ])

    let allTasks: any[] = allTasksRaw as any[]

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

    const fixedTasks = pendingTasks.filter((t: any) => t.is_fixed_time === 1 || t.is_fixed_time === true)
    const flexTasks = pendingTasks.filter((t: any) => !t.is_fixed_time)

    // Detectar conflictos entre tareas fijas (solapamiento de hora)
    const fixedConflicts: string[] = []
    for (let i = 0; i < fixedTasks.length; i++) {
      for (let j = i + 1; j < fixedTasks.length; j++) {
        const a = fixedTasks[i] as any
        const b = fixedTasks[j] as any
        const aStart = (a.hour || 9) * 60
        const aEnd = aStart + (a.duration || 60)
        const bStart = (b.hour || 9) * 60
        const bEnd = bStart + (b.duration || 60)
        if (aStart < bEnd && bStart < aEnd) {
          fixedConflicts.push(
            `"${a.title}" (${a.hour || 9}:00, ${a.duration || 60}min) se superpone con "${b.title}" (${b.hour || 9}:00, ${b.duration || 60}min)`
          )
        }
      }
    }

    const fixedSummary = fixedTasks.length > 0
      ? `\nTAREAS CON HORARIO FIJO (NO MOVER - incluir exactamente en su hora):\n` +
        fixedTasks.map((t: any) => `  🔒 "${t.title ?? "(sin título)"}" — hora fija: ${t.hour || 9}:00 | ${t.duration || 60}min`).join('\n')
      : ''

    const conflictNote = fixedConflicts.length > 0
      ? `\n⚠️ CONFLICTOS DETECTADOS ENTRE TAREAS FIJAS:\n` +
        fixedConflicts.map((c) => `  • ${c}`).join('\n') +
        `\nInforma estos conflictos en el campo "conflicts" del JSON.`
      : ''

    const tasksSummary = flexTasks
      .map((t: any, i: number) =>
        `  ${i + 1}. "${t.title ?? "(sin título)"}" — ${t.duration ?? 60}min | ${t.category ?? "?"} | ${t.priority ?? "normal"} prioridad`
      )
      .join("\n")

    const moodsSummary = (allMoods as any[])
      .slice(0, 10)
      .map((m: any) => `  [${m.date ?? "?"} ${m.hour ?? "?"}h] energía:${m.energy ?? 0} foco:${m.focus ?? 0} estrés:${m.stress ?? 0}`)
      .join("\n")

    const prompt = `Pico de energía del usuario: ${peakInfo}${stressNote}${conflictNote}
${fixedSummary}
TAREAS FLEXIBLES A PROGRAMAR (${flexTasks.length} tareas — programa cada una UNA sola vez):
${tasksSummary || "  (sin tareas flexibles)"}

Historial de energía/foco (últimas entradas):
${moodsSummary || "  • Sin datos"}

Genera un horario para el día ${targetDate} (07:00–22:00) con estas reglas:
1. Cada tarea aparece exactamente UNA vez en el schedule. No la repitas ni dividas.
2. Usa el título EXACTO de la lista (copia literalmente, sin modificar).
3. Las tareas 🔒 van en su hora fija indicada, sin mover.
4. Tareas de mayor prioridad → ventana de pico de energía (${peakInfo}).
5. Respeta restricciones de horario por tipo (ver instrucción del sistema).
6. Solo añade "🧘 Descanso" (30min) si el trabajo total supera 4 horas, máximo 1 descanso.
7. Si una tarea flexible choca con una fija, agrégala en "conflicts".

Responde SOLO con este JSON (sin markdown, sin texto antes ni después):
{"schedule":[{"time":"09:00","task":"título exacto","duration":60}],"conflicts":[],"warnings":[]}`

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

    // Combinar conflictos detectados en servidor + los que detectó Gemini
    const allConflicts: string[] = [
      ...fixedConflicts,
      ...(Array.isArray(parsedSchedule.conflicts) ? parsedSchedule.conflicts : []),
    ]

    return NextResponse.json({
      success: true,
      originalTasks: allTasks,
      pendingTasks,
      optimizedSchedule: parsedSchedule.schedule ?? [],
      conflicts: allConflicts,
      warnings: parsedSchedule.warnings ?? [],
      response: responseText,
      date: targetDate,
      source: "gemini" as const,
    })
  } catch (error) {
    console.error("[schedule:optimize] Error:", error)
    return NextResponse.json({ error: "Error optimizando horario" }, { status: 500 })
  }
}
