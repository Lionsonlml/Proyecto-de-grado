import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getGeminiUserTasks, getGeminiUserMoods, saveSecureInsight } from "@/lib/secure-data"
import { getGeminiApiKey } from "@/lib/gemini-config"
import { ensureDbReady } from "@/lib/db"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"
import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"
import { evaluateResponse } from "@/lib/ai-evaluator"
import {
  FALLBACK_PATTERNS,
  FALLBACK_RECOMMENDATIONS,
} from "@/lib/ai-fallbacks"

// ─── Sistema: Coach Conductual ────────────────────────────────────────────────

const BEHAVIORAL_COACH_INSTRUCTION = `Eres un Coach Conductual de productividad personal. Metodología:
• Técnicas CBT: identifica patrones cognitivos que bloquean la productividad.
• Regla de 2 minutos: si una tarea toma < 2 min, se hace de inmediato.
• Time Blocking: agrupa tareas por tipo y ventana de máxima energía del usuario.
• Pareto 80/20: el 20% de las tareas genera el 80% del valor — prioriza ese 20%.

PROTOCOLO DE ESTRÉS: Si el estrés promedio es ≥ 4/10, incluye PRIMERO estrategias de bienestar y manejo del estrés antes de cualquier recomendación de productividad.
VENTANA DE RENDIMIENTO: Detecta el peak de energía+foco en el historial del usuario y personaliza todas las recomendaciones a esa ventana horaria específica.
FORMATO: Responde SIEMPRE en JSON válido sin markdown. Sé específico, accionable y empático.`

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function buildContextSummary(
  allTasks: ReturnType<typeof Array.prototype.map>,
  allMoods: ReturnType<typeof Array.prototype.map>
) {
  const completedTasks = (allTasks as any[]).filter((t) => t.completed)
  const completionRate =
    allTasks.length > 0
      ? Math.round((completedTasks.length / (allTasks as any[]).length) * 100)
      : 0

  // Tasa de completación por categoría
  const categoryCounts: Record<string, { total: number; completed: number }> = {}
  for (const task of allTasks as any[]) {
    const cat = (task.category as string) || "sin categoría"
    if (!categoryCounts[cat]) categoryCounts[cat] = { total: 0, completed: 0 }
    categoryCounts[cat].total++
    if (task.completed) categoryCounts[cat].completed++
  }
  const categoryBreakdown = Object.entries(categoryCounts)
    .map(([cat, s]) => `  • ${cat}: ${s.completed}/${s.total} completadas (${Math.round((s.completed / s.total) * 100)}%)`)
    .join("\n")

  // Ventana de rendimiento pico (mayor promedio energía+foco)
  const hourStats: Record<number, { energy: number[]; focus: number[]; stress: number[] }> = {}
  for (const mood of allMoods as any[]) {
    if (mood.hour == null) continue
    const h = mood.hour as number
    if (!hourStats[h]) hourStats[h] = { energy: [], focus: [], stress: [] }
    hourStats[h].energy.push(mood.energy ?? 0)
    hourStats[h].focus.push(mood.focus ?? 0)
    hourStats[h].stress.push(mood.stress ?? 0)
  }
  const peakHour = Object.entries(hourStats)
    .map(([h, s]) => ({
      hour: parseInt(h),
      score: (avg(s.energy) + avg(s.focus)) / 2,
    }))
    .sort((a, b) => b.score - a.score)[0]

  const totalStress = (allMoods as any[]).reduce((sum, m) => sum + (m.stress ?? 0), 0)
  const avgStress = allMoods.length > 0 ? totalStress / (allMoods as any[]).length : 0

  // Resumen de moods (últimos 20, con fecha y notas)
  const moodsSummary = (allMoods as any[])
    .slice(0, 20)
    .map(
      (m) =>
        `  [${m.date || "?"} ${m.hour ?? "?"}h] ${m.type ?? ""} — Energía:${m.energy ?? 0}/5 Foco:${m.focus ?? 0}/5 Estrés:${m.stress ?? 0}/5${m.notes ? ` | "${m.notes}"` : ""}`
    )
    .join("\n")

  // Resumen de tareas recientes
  const tasksSummary = (allTasks as any[])
    .slice(0, 25)
    .map(
      (t) =>
        `  • [${t.date || "?"}] ${t.title ?? "(sin título)"} — ${t.category ?? "?"} | ${t.priority ?? "?"} prio | ${t.duration ?? 0}min | ${t.completed ? "✓ completada" : "○ pendiente"}${t.status === "cancelled" ? " (cancelada)" : ""}`
    )
    .join("\n")

  return {
    completionRate,
    categoryBreakdown,
    peakHour,
    avgStress,
    moodsSummary,
    tasksSummary,
    totalTasks: (allTasks as any[]).length,
    completedCount: completedTasks.length,
    moodsCount: (allMoods as any[]).length,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  await ensureDbReady()

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

    const today = new Date().toISOString().split("T")[0]
    const cacheKey = buildCacheKey("analyze", analysisType, date || today)

    // ── 1. Caché ──────────────────────────────────────────────────────────────
    const cached = await getCached(user.id, cacheKey)
    if (cached) {
      try {
        const parsed = JSON.parse(cached.response)
        return NextResponse.json({
          success: true,
          analysisType,
          ...parsed,
          source: "cache" as const,
          cachedAt: cached.cachedAt,
        })
      } catch {
        // cache corrupto → continuar con Gemini
      }
    }

    // ── 2. Datos descifrados ──────────────────────────────────────────────────
    const [allTasks, allMoods] = await Promise.all([
      getGeminiUserTasks(user.id, user.id, date, request),
      getGeminiUserMoods(user.id, user.id, date, request),
    ])

    const ctx = buildContextSummary(allTasks, allMoods)

    const stressAlert =
      ctx.avgStress >= 4
        ? `\n⚠️ ALERTA DE ESTRÉS: El estrés promedio del usuario es ${ctx.avgStress.toFixed(1)}/10. Aplica el PROTOCOLO DE ESTRÉS primero.`
        : ""

    const peakInfo = ctx.peakHour
      ? `~${ctx.peakHour.hour}:00h (score ${ctx.peakHour.score.toFixed(1)}/10)`
      : "no determinada"

    const dataContext = `
PERFIL DE PRODUCTIVIDAD (últimos ${ctx.moodsCount} registros):
Total tareas: ${ctx.totalTasks} | Completadas: ${ctx.completedCount} | Tasa global: ${ctx.completionRate}%
Estrés promedio: ${ctx.avgStress.toFixed(1)}/10${stressAlert}
Ventana de rendimiento pico detectada: ${peakInfo}

DESEMPEÑO POR CATEGORÍA:
${ctx.categoryBreakdown || "  • Sin datos suficientes"}

HISTORIAL DE ESTADOS DE ÁNIMO (recientes → cronológico):
${ctx.moodsSummary || "  • Sin datos"}

HISTORIAL DE TAREAS (recientes):
${ctx.tasksSummary || "  • Sin datos"}`

    // ── 3. Construir prompt según tipo de análisis ─────────────────────────────
    let prompt: string

    if (analysisType === "patterns") {
      prompt = `${dataContext}

Analiza los datos anteriores y responde con este JSON exacto:
{
  "patterns": ["patrón 1 con datos reales", "patrón 2", "patrón 3"],
  "optimal_times": {
    "peak_performance": "rango horario pico con energía+foco máximos",
    "mañana": "descripción de rendimiento matutino",
    "tarde": "descripción de rendimiento vespertino"
  },
  "procrastination_analysis": {
    "categories_at_risk": ["categoría con baja completación"],
    "pattern": "descripción del patrón de postergación observado"
  },
  "stress_status": {
    "level": "bajo/medio/alto",
    "recommendations": ["acción concreta 1", "acción concreta 2"]
  },
  "correlations": ["correlación dato→resultado 1", "correlación 2"],
  "recommendations": ["recomendación personalizada 1", "recomendación 2", "recomendación 3"]
}`
    } else if (analysisType === "recommendations") {
      prompt = `${dataContext}

Genera 5 recomendaciones altamente personalizadas basadas en los datos. Responde con este JSON exacto:
{
  "recommendations": [
    "recomendación específica 1 basada en el patrón real del usuario",
    "recomendación 2",
    "recomendación 3",
    "recomendación 4",
    "recomendación 5"
  ],
  "priority_action": "la acción más importante que el usuario debe tomar hoy",
  "stress_note": "observación sobre nivel de estrés (si aplica)"
}`
    } else {
      // schedule mode
      const pending = (allTasks as any[]).filter((t) => !t.completed)
      const pendingSummary = pending
        .map((t: any) => `  • ${t.title ?? "(sin título)"} — ${t.duration ?? 60}min (${t.category ?? "?"}/${t.priority ?? "?"} prio)`)
        .join("\n")

      prompt = `${dataContext}

TAREAS PENDIENTES A PROGRAMAR:
${pendingSummary || "  • Sin tareas pendientes"}

Crea un horario optimizado para hoy respetando la ventana de rendimiento pico detectada (${peakInfo}). JSON exacto:
{
  "schedule": [
    {"time": "09:00", "task": "nombre exacto de la tarea", "duration": 60, "reason": "explicación breve basada en el patrón del usuario"}
  ]
}`
    }

    // ── 4. Llamar a Gemini con retry ──────────────────────────────────────────
    const apiKey = getGeminiApiKey()
    let responseText: string
    let geminiAttempts = 1

    try {
      const result = await callGeminiWithRetry(prompt, {
        apiKey,
        temperature: 0.7,
        systemInstruction: BEHAVIORAL_COACH_INSTRUCTION,
      })
      responseText = result.text
      geminiAttempts = result.attempts
    } catch (err) {
      // ── Fallback ──────────────────────────────────────────────────────────
      if (err instanceof GeminiRetryError) {
        await logFallback(user.id, `analyze:${analysisType}`, err.reason, err.attempts)
      }

      const fallbackData =
        analysisType === "recommendations" ? FALLBACK_RECOMMENDATIONS : FALLBACK_PATTERNS

      return NextResponse.json({
        success: true,
        analysisType,
        ...fallbackData,
        source: "fallback" as const,
      })
    }

    // ── 5. Parsear respuesta ───────────────────────────────────────────────────
    let parsed: unknown = null
    try {
      const jsonMatch =
        responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
        responseText.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : responseText
      parsed = JSON.parse(jsonStr)
    } catch {
      parsed = null
    }

    // ── 6. Evaluador interno ─────────────────────────────────────────────────
    const evaluation = await evaluateResponse(responseText, analysisType, `${allTasks.length} tareas, ${allMoods.length} moods`)

    // ── 7. Guardar en caché ───────────────────────────────────────────────────
    const cachePayload = JSON.stringify({ response: responseText, parsed })
    await setCached(user.id, cacheKey, cachePayload)

    // ── 8. Audit trail (fire-and-forget) ─────────────────────────────────────
    saveSecureInsight(
      user.id,
      { prompt, response: responseText, analysis_type: analysisType },
      request
    ).catch(() => {})

    if (process.env.NODE_ENV !== "production") {
      console.log(`[analyze] ${analysisType} | tasks:${allTasks.length} moods:${allMoods.length} | attempts:${geminiAttempts} | eval:${evaluation.combinedScore}`)
    }

    return NextResponse.json({
      success: true,
      analysisType,
      response: responseText,
      parsed,
      evaluation,
      source: "gemini" as const,
      stats: {
        date: date || "all",
        counts: { tasks: allTasks.length, moods: allMoods.length },
        peakHour: ctx.peakHour?.hour ?? null,
        avgStress: Math.round(ctx.avgStress * 10) / 10,
        completionRate: ctx.completionRate,
      },
    })
  } catch (error) {
    console.error("[analyze] Error:", error)
    return NextResponse.json({ error: "Error generando análisis" }, { status: 500 })
  }
}
