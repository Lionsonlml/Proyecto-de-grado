import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { ensureDbReady, getDb } from "@/lib/db"

/**
 * /api/admin/impact
 *
 * Evidencia el objetivo general del proyecto: "mejorar la productividad y el
 * bienestar de los usuarios". Devuelve series temporales semanales agregadas y
 * una comparativa "primera semana vs. semana actual".
 *
 * Privacidad por diseño:
 *  - Solo métricas AGREGADAS (promedios/conteos), nunca datos individuales ni
 *    contenido de tareas/notas.
 *  - Umbral de supresión: una semana solo se publica si tiene al menos
 *    MIN_RECORDS_PER_WEEK registros, para evitar exponer datos de muy pocas
 *    personas y reducir ruido estadístico.
 *  - No se descifra ningún campo sensible: energy/focus/stress y el estado de
 *    las tareas se almacenan en claro y son no identificables por sí mismos.
 */

// Mínimo de registros por semana para publicar el punto (anti re-identificación / ruido).
const MIN_RECORDS_PER_WEEK = 3
// Ventana de análisis (días). Generosa para capturar los datos existentes.
const LOOKBACK_DAYS = 365

/** Lunes (ISO) de la semana a la que pertenece una fecha 'YYYY-MM-DD'. */
function weekStartMonday(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z")
  const day = d.getUTCDay() // 0=domingo .. 6=sábado
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

type WeekBucket = {
  week: string
  taskTotal: number
  taskCompleted: number
  moodCount: number
  sumEnergy: number
  sumFocus: number
  sumStress: number
}

function emptyBucket(week: string): WeekBucket {
  return { week, taskTotal: 0, taskCompleted: 0, moodCount: 0, sumEnergy: 0, sumFocus: 0, sumStress: 0 }
}

function trendOf(change: number, threshold: number): "up" | "down" | "flat" {
  if (change > threshold) return "up"
  if (change < -threshold) return "down"
  return "flat"
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || payload.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    await ensureDbReady()
    const db = getDb()

    const [tasksRes, moodsRes] = await Promise.all([
      // Tareas agregadas por día (estado en claro)
      db.execute(`
        SELECT
          date,
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completed
        FROM tasks
        WHERE date >= date('now', '-${LOOKBACK_DAYS} days')
        GROUP BY date
      `),
      // Ánimo agregado por día (energy/focus/stress en claro, 1-5)
      db.execute(`
        SELECT
          date,
          COUNT(*) as n,
          SUM(energy) as sum_energy,
          SUM(focus) as sum_focus,
          SUM(stress) as sum_stress
        FROM moods
        WHERE date >= date('now', '-${LOOKBACK_DAYS} days')
        GROUP BY date
      `),
    ])

    // Agrupar días en semanas (lunes ISO)
    const buckets = new Map<string, WeekBucket>()
    const getBucket = (week: string) => {
      let b = buckets.get(week)
      if (!b) {
        b = emptyBucket(week)
        buckets.set(week, b)
      }
      return b
    }

    for (const row of tasksRes.rows) {
      const date = row.date as string | null
      if (!date) continue
      const b = getBucket(weekStartMonday(date))
      b.taskTotal += Number(row.total ?? 0)
      b.taskCompleted += Number(row.completed ?? 0)
    }

    for (const row of moodsRes.rows) {
      const date = row.date as string | null
      if (!date) continue
      const b = getBucket(weekStartMonday(date))
      b.moodCount += Number(row.n ?? 0)
      b.sumEnergy += Number(row.sum_energy ?? 0)
      b.sumFocus += Number(row.sum_focus ?? 0)
      b.sumStress += Number(row.sum_stress ?? 0)
    }

    const ordered = Array.from(buckets.values()).sort((a, b) => a.week.localeCompare(b.week))

    // Construir series semanales con supresión por umbral
    const weeks = ordered.map((b) => {
      const taskOk = b.taskTotal >= MIN_RECORDS_PER_WEEK
      const moodOk = b.moodCount >= MIN_RECORDS_PER_WEEK

      const productivity = taskOk ? Math.round((b.taskCompleted / b.taskTotal) * 100) : null

      // Índice de bienestar 1-5: media de (energía, concentración, estrés invertido).
      // Estrés invertido = 6 - estrés (poco estrés => puntúa alto).
      const wellbeing = moodOk
        ? Math.round(((b.sumEnergy + b.sumFocus + (6 * b.moodCount - b.sumStress)) / (3 * b.moodCount)) * 100) / 100
        : null

      const avgEnergy = moodOk ? Math.round((b.sumEnergy / b.moodCount) * 100) / 100 : null
      const avgFocus = moodOk ? Math.round((b.sumFocus / b.moodCount) * 100) / 100 : null
      const avgStress = moodOk ? Math.round((b.sumStress / b.moodCount) * 100) / 100 : null

      return {
        week: b.week,
        productivity,
        wellbeing,
        avgEnergy,
        avgFocus,
        avgStress,
        taskSamples: b.taskTotal,
        moodSamples: b.moodCount,
      }
    })

    // Comparativa primera vs. última semana CON dato (independiente por métrica)
    const prodPoints = weeks.filter((w) => w.productivity !== null)
    const wellPoints = weeks.filter((w) => w.wellbeing !== null)

    const productivityDelta =
      prodPoints.length > 0
        ? (() => {
            const first = prodPoints[0]
            const last = prodPoints[prodPoints.length - 1]
            const change = (last.productivity as number) - (first.productivity as number)
            return {
              baseline: first.productivity as number,
              recent: last.productivity as number,
              change,
              baselineWeek: first.week,
              recentWeek: last.week,
              weeksTracked: prodPoints.length,
              trend: trendOf(change, 1),
            }
          })()
        : null

    const wellbeingDelta =
      wellPoints.length > 0
        ? (() => {
            const first = wellPoints[0]
            const last = wellPoints[wellPoints.length - 1]
            const change = Math.round(((last.wellbeing as number) - (first.wellbeing as number)) * 100) / 100
            return {
              baseline: first.wellbeing as number,
              recent: last.wellbeing as number,
              change,
              baselineWeek: first.week,
              recentWeek: last.week,
              weeksTracked: wellPoints.length,
              trend: trendOf(change, 0.1),
            }
          })()
        : null

    const totalTasks = ordered.reduce((s, b) => s + b.taskTotal, 0)
    const totalMoods = ordered.reduce((s, b) => s + b.moodCount, 0)

    return NextResponse.json({
      weeks,
      productivity: productivityDelta,
      wellbeing: wellbeingDelta,
      meta: {
        weekCount: weeks.length,
        totalTasks,
        totalMoods,
        minRecordsPerWeek: MIN_RECORDS_PER_WEEK,
        lookbackDays: LOOKBACK_DAYS,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[admin/impact] Error:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
