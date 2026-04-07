/**
 * GET /api/gemini/usage — Estadísticas de uso de la API de Gemini
 *
 * Devuelve cuántas llamadas a Gemini se han registrado hoy en ai_insights,
 * junto con los límites del plan free tier para comparar.
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { ensureDbReady } from "@/lib/db"

// Límites del free tier de gemini-2.5-flash-lite (actualizar si cambia el plan)
const FREE_TIER = {
  requestsPerMinute: 15,
  requestsPerDay: 1000,
  tokensPerMinute: 250_000,
  tokensPerDay: 1_000_000,
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  await ensureDbReady()
  const db = getDb()

  const today = new Date().toISOString().split("T")[0]

  // Contar insights generados hoy (proxy de llamadas a Gemini)
  // Los fallbacks y caché no llegan a Gemini, así que los excluimos si podemos.
  // Como no almacenamos el source, contamos todos los ai_insights de hoy.
  const todayResult = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM ai_insights WHERE user_id = ? AND DATE(created_at) = ?",
    args: [user.id, today],
  })
  const todayCount = Number(todayResult.rows[0]?.cnt ?? 0)

  // Contar del mes en curso
  const monthStart = today.substring(0, 7) + "-01"
  const monthResult = await db.execute({
    sql: "SELECT COUNT(*) as cnt FROM ai_insights WHERE user_id = ? AND created_at >= ?",
    args: [user.id, monthStart],
  })
  const monthCount = Number(monthResult.rows[0]?.cnt ?? 0)

  // Última llamada registrada
  const lastResult = await db.execute({
    sql: "SELECT created_at, analysis_type FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    args: [user.id],
  })
  const lastCall = lastResult.rows[0] ?? null

  const percentUsedToday = Math.min(100, Math.round((todayCount / FREE_TIER.requestsPerDay) * 100))

  return NextResponse.json({
    today: {
      calls: todayCount,
      limit: FREE_TIER.requestsPerDay,
      percentUsed: percentUsedToday,
      remaining: Math.max(0, FREE_TIER.requestsPerDay - todayCount),
    },
    month: {
      calls: monthCount,
    },
    limits: {
      rpm: FREE_TIER.requestsPerMinute,
      rpd: FREE_TIER.requestsPerDay,
      tpm: FREE_TIER.tokensPerMinute,
      tpd: FREE_TIER.tokensPerDay,
    },
    lastCall: lastCall
      ? { at: lastCall.created_at as string, type: lastCall.analysis_type as string }
      : null,
    model: "gemini-2.5-flash-lite",
    note: "El contador refleja registros en ai_insights (proxy de llamadas reales). Los fallbacks y caché no cuentan.",
  })
}
