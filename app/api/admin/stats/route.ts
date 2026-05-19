import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { ensureDbReady, getDb } from "@/lib/db"
import { decryptField } from "@/lib/encryption"

const ANALYSIS_TYPE_LABELS: Record<string, string> = {
  patterns: "Análisis de patrones",
  recommendations: "Recomendaciones",
  schedule: "Optimización de horario",
  motivational: "Frase motivacional",
}

const ENDPOINT_LABELS: Record<string, string> = {
  "analyze:patterns": "Análisis de patrones",
  "analyze:recommendations": "Recomendaciones",
  "analyze:schedule": "Optimización de horario",
  "motivational": "Frase motivacional",
}

function labelType(raw: string): string {
  return ANALYSIS_TYPE_LABELS[raw] ?? raw
}

function labelEndpoint(raw: string): string {
  return ENDPOINT_LABELS[raw] ?? raw
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

    const [
      usersRes,
      rolesRes,
      tasksRes,
      taskStatusRes,
      taskCategoryRes,
      moodsRes,
      moodTypeRes,
      aiInsightsRes,
      aiCacheRes,
      fallbackRes,
      activeUsersRes,
      recentActivityRes,
    ] = await Promise.all([
      // Total usuarios
      db.execute("SELECT COUNT(*) as total FROM users"),
      // Distribución de roles
      db.execute(`
        SELECT COALESCE(r.role, 'user') as role, COUNT(*) as count
        FROM users u
        LEFT JOIN user_roles r ON u.id = r.user_id
        GROUP BY COALESCE(r.role, 'user')
      `),
      // Estadísticas globales de tareas
      db.execute(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completada' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'pendiente' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'en-progreso' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'cancelada' THEN 1 ELSE 0 END) as cancelled,
          AVG(duration) as avg_duration
        FROM tasks
      `),
      // Tareas por estado últimos 7 días
      db.execute(`
        SELECT date, status, COUNT(*) as count
        FROM tasks
        WHERE date >= date('now', '-7 days')
        GROUP BY date, status
        ORDER BY date DESC
      `),
      // Categorías más usadas
      db.execute(`
        SELECT category, COUNT(*) as count
        FROM tasks
        GROUP BY category
        ORDER BY count DESC
        LIMIT 6
      `),
      // Estadísticas globales de ánimo
      db.execute(`
        SELECT
          COUNT(*) as total,
          ROUND(AVG(energy), 2) as avg_energy,
          ROUND(AVG(focus), 2) as avg_focus,
          ROUND(AVG(stress), 2) as avg_stress
        FROM moods
      `),
      // Tipos de ánimo más frecuentes
      db.execute(`
        SELECT type, COUNT(*) as count
        FROM moods
        GROUP BY type
        ORDER BY count DESC
        LIMIT 8
      `),
      // Llamadas a Gemini — traemos analysis_type cifrado, agrupamos en JS
      db.execute(`SELECT analysis_type FROM ai_insights`),
      // Hits de caché IA
      db.execute(`
        SELECT
          COUNT(*) as total_entries,
          SUM(CASE WHEN expires_at > datetime('now') THEN 1 ELSE 0 END) as active_entries
        FROM ai_cache
      `),
      // Fallbacks registrados
      db.execute(`
        SELECT endpoint, COUNT(*) as count, SUM(attempts) as total_attempts
        FROM ai_fallback_logs
        GROUP BY endpoint
        ORDER BY count DESC
        LIMIT 8
      `),
      // Usuarios activos últimos 7 días (con al menos 1 tarea o mood)
      db.execute(`
        SELECT COUNT(DISTINCT user_id) as count FROM (
          SELECT user_id FROM tasks WHERE date >= date('now', '-7 days')
          UNION
          SELECT user_id FROM moods WHERE date >= date('now', '-7 days')
        )
      `),
      // Actividad reciente (registros por día, últimos 14 días)
      db.execute(`
        SELECT date, COUNT(*) as tasks_created FROM tasks
        WHERE date >= date('now', '-14 days')
        GROUP BY date
        ORDER BY date DESC
        LIMIT 14
      `),
    ])

    const taskStats = tasksRes.rows[0]
    const moodStats = moodsRes.rows[0]
    const cacheStats = aiCacheRes.rows[0]

    const completionRate = taskStats.total
      ? Math.round(((taskStats.completed as number) / (taskStats.total as number)) * 100)
      : 0

    // Descifrar analysis_type y agrupar en JS
    const typeCounts: Record<string, number> = {}
    for (const row of aiInsightsRes.rows) {
      const raw = decryptField(row.analysis_type as string) ?? (row.analysis_type as string) ?? "desconocido"
      const label = labelType(raw)
      typeCounts[label] = (typeCounts[label] ?? 0) + 1
    }
    const byType = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }))

    return NextResponse.json({
      users: {
        total: usersRes.rows[0]?.total ?? 0,
        activeLastWeek: activeUsersRes.rows[0]?.count ?? 0,
        byRole: rolesRes.rows.map((r) => ({ role: r.role, count: r.count })),
      },
      tasks: {
        total: taskStats.total ?? 0,
        completed: taskStats.completed ?? 0,
        pending: taskStats.pending ?? 0,
        inProgress: taskStats.in_progress ?? 0,
        cancelled: taskStats.cancelled ?? 0,
        completionRate,
        avgDurationMin: taskStats.avg_duration ? Math.round(taskStats.avg_duration as number) : 0,
        byCategory: taskCategoryRes.rows.map((r) => ({ category: r.category, count: r.count })),
        recentActivity: recentActivityRes.rows,
      },
      moods: {
        total: moodStats.total ?? 0,
        avgEnergy: moodStats.avg_energy ?? 0,
        avgFocus: moodStats.avg_focus ?? 0,
        avgStress: moodStats.avg_stress ?? 0,
        byType: moodTypeRes.rows.map((r) => ({ type: r.type, count: r.count })),
      },
      ai: {
        totalInsights: aiInsightsRes.rows.length,
        byType,
        cache: {
          totalEntries: cacheStats.total_entries ?? 0,
          activeEntries: cacheStats.active_entries ?? 0,
        },
        fallbacks: fallbackRes.rows.map((r) => ({
          endpoint: labelEndpoint(r.endpoint as string),
          count: r.count,
          totalAttempts: r.total_attempts,
        })),
      },
    })
  } catch (error) {
    console.error("[admin/stats] Error:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
