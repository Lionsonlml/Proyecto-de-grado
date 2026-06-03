// Registro y resumen del consumo REAL de tokens de Gemini + cuota por API key.
//
// - Los tokens provienen de `usageMetadata` que Gemini devuelve en cada llamada
//   (prompt/candidates/total). Se registran a nivel de KEY (no de usuario) porque
//   la cuota de la API es por key/proyecto, no por usuario.
// - Google NO expone la cuota restante en vivo, así que "lo que queda" se ESTIMA
//   comparando el consumo registrado contra los límites del plan declarado.
// - El tier (gratuito / de pago) se declara desde el panel admin y se guarda en
//   `app_settings` (clave `gemini_key_tier`).

import { getDb, ensureDbReady } from "./db"

export type KeyTier = "free" | "paid"

// ─── Límites de referencia por plan (gemini-2.5-flash-lite) ──────────────────
// Actualiza estos valores si Google cambia el plan. `rpd: null` = sin tope diario
// práctico (el plan de pago no impone un límite diario relevante para este modelo).
export const PLAN_LIMITS: Record<KeyTier, { rpm: number; rpd: number | null; tpm: number }> = {
  free: { rpm: 15, rpd: 1000, tpm: 250_000 },
  paid: { rpm: 4000, rpd: null, tpm: 4_000_000 },
}

// Precio de referencia del plan de pago, en USD por millón de tokens
// (gemini-2.5-flash-lite). Sirve para estimar el coste. Ajusta si cambia la tarifa.
export const PRICING_PER_MILLION = { input: 0.1, output: 0.4 }

function costUsd(promptTokens: number, candidatesTokens: number): number {
  const c =
    (promptTokens / 1_000_000) * PRICING_PER_MILLION.input +
    (candidatesTokens / 1_000_000) * PRICING_PER_MILLION.output
  return Math.round(c * 1e6) / 1e6
}

// Convierte un Date a "YYYY-MM-DD HH:MM:SS" en UTC, el mismo formato que
// `datetime('now')` de SQLite, para comparar columnas created_at sin ambigüedad.
function toDbUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ")
}

// ─── Ventana de cuota diaria (medianoche hora del Pacífico) ──────────────────
// La cuota diaria de Gemini se reinicia a las 00:00 PT. Calculamos el instante
// (en UTC) de la última medianoche PT y de la próxima.
function pacificClock(date: Date): { hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0")
  let hour = get("hour")
  if (hour === 24) hour = 0 // en-US devuelve "24" a medianoche en algunos entornos
  return { hour, minute: get("minute"), second: get("second") }
}

function getDailyWindow(): { windowStart: Date; resetAt: Date; msUntilReset: number } {
  const now = new Date()
  const { hour, minute, second } = pacificClock(now)
  const elapsedMs = ((hour * 60 + minute) * 60 + second) * 1000 + now.getMilliseconds()
  const windowStart = new Date(now.getTime() - elapsedMs) // última 00:00 PT (instante UTC)
  const resetAt = new Date(windowStart.getTime() + 24 * 60 * 60 * 1000) // próxima 00:00 PT (aprox.)
  return { windowStart, resetAt, msUntilReset: Math.max(0, resetAt.getTime() - now.getTime()) }
}

// ─── Tier de la key (persistido en app_settings) ─────────────────────────────
export async function getKeyTier(): Promise<KeyTier> {
  try {
    const db = getDb()
    const r = await db.execute({
      sql: "SELECT value FROM app_settings WHERE key = 'gemini_key_tier'",
      args: [],
    })
    return (r.rows[0]?.value as string) === "paid" ? "paid" : "free"
  } catch {
    return "free"
  }
}

export async function setKeyTier(tier: KeyTier): Promise<void> {
  await ensureDbReady()
  const db = getDb()
  await db.execute({
    sql: `INSERT INTO app_settings (key, value, updated_at)
          VALUES ('gemini_key_tier', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [tier],
  })
}

// ─── Registro de uso (best-effort: NUNCA debe romper la llamada a la IA) ──────
export async function recordGeminiUsage(entry: {
  model?: string
  endpoint?: string | null
  promptTokens?: number
  candidatesTokens?: number
  totalTokens?: number
  attempts?: number
}): Promise<void> {
  try {
    await ensureDbReady()
    const db = getDb()
    const prompt = Math.max(0, Math.round(entry.promptTokens ?? 0))
    const candidates = Math.max(0, Math.round(entry.candidatesTokens ?? 0))
    const total = Math.max(0, Math.round(entry.totalTokens ?? prompt + candidates))
    await db.execute({
      sql: `INSERT INTO gemini_usage (model, endpoint, prompt_tokens, candidates_tokens, total_tokens, attempts)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [entry.model ?? null, entry.endpoint ?? null, prompt, candidates, total, entry.attempts ?? 1],
    })
  } catch (err) {
    // best-effort: el registro de consumo nunca debe interrumpir la respuesta de IA
    if (process.env.NODE_ENV === "development") {
      console.error("[gemini-usage] No se pudo registrar el consumo:", err)
    }
  }
}

// ─── Resumen de consumo + cuota ──────────────────────────────────────────────
export interface UsageSummary {
  tier: KeyTier
  limits: { rpm: number; rpd: number | null; tpm: number }
  daily: {
    requests: number
    promptTokens: number
    candidatesTokens: number
    totalTokens: number
    requestsRemaining: number | null
    percentUsed: number | null
  }
  minute: {
    requests: number
    totalTokens: number
    rpmRemaining: number
    percentRpm: number
    tpmRemaining: number
    percentTpm: number
  }
  month: { requests: number; promptTokens: number; candidatesTokens: number; totalTokens: number }
  reset: { dailyAtIso: string; dailyInMs: number; timezone: string }
  cost: {
    perMillion: { input: number; output: number }
    todayUsd: number
    monthUsd: number
    projectedMonthUsd: number
    isFree: boolean
    currency: "USD"
  }
  lastCall: { at: string; totalTokens: number; endpoint: string | null } | null
}

export async function getUsageSummary(): Promise<UsageSummary> {
  await ensureDbReady()
  const db = getDb()

  const tier = await getKeyTier()
  const limits = PLAN_LIMITS[tier]

  const now = new Date()
  const { windowStart, resetAt, msUntilReset } = getDailyWindow()
  const minuteStart = new Date(now.getTime() - 60_000)
  const monthStart = `${now.toISOString().slice(0, 7)}-01 00:00:00`

  const agg = `SELECT COUNT(*) AS c,
      COALESCE(SUM(prompt_tokens), 0) AS pt,
      COALESCE(SUM(candidates_tokens), 0) AS ct,
      COALESCE(SUM(total_tokens), 0) AS tt
    FROM gemini_usage WHERE created_at >= ?`

  const [dailyR, minuteR, monthR, lastR] = await Promise.all([
    db.execute({ sql: agg, args: [toDbUtc(windowStart)] }),
    db.execute({ sql: agg, args: [toDbUtc(minuteStart)] }),
    db.execute({ sql: agg, args: [monthStart] }),
    db.execute({
      sql: "SELECT created_at, total_tokens, endpoint FROM gemini_usage ORDER BY id DESC LIMIT 1",
      args: [],
    }),
  ])

  const num = (r: any, k: string) => Number(r.rows[0]?.[k] ?? 0)

  const daily = {
    requests: num(dailyR, "c"),
    promptTokens: num(dailyR, "pt"),
    candidatesTokens: num(dailyR, "ct"),
    totalTokens: num(dailyR, "tt"),
  }
  const minute = { requests: num(minuteR, "c"), totalTokens: num(minuteR, "tt") }
  const month = {
    requests: num(monthR, "c"),
    promptTokens: num(monthR, "pt"),
    candidatesTokens: num(monthR, "ct"),
    totalTokens: num(monthR, "tt"),
  }

  const requestsRemaining = limits.rpd != null ? Math.max(0, limits.rpd - daily.requests) : null
  const percentUsed =
    limits.rpd != null ? Math.min(100, Math.round((daily.requests / limits.rpd) * 100)) : null

  const rpmRemaining = Math.max(0, limits.rpm - minute.requests)
  const percentRpm = Math.min(100, Math.round((minute.requests / limits.rpm) * 100))
  const tpmRemaining = Math.max(0, limits.tpm - minute.totalTokens)
  const percentTpm = Math.min(100, Math.round((minute.totalTokens / limits.tpm) * 100))

  const todayUsd = costUsd(daily.promptTokens, daily.candidatesTokens)
  const monthUsd = costUsd(month.promptTokens, month.candidatesTokens)
  const dayOfMonth = Number(now.toISOString().slice(8, 10))
  const daysInMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 0).getUTCDate()
  const projectedMonthUsd =
    dayOfMonth > 0 ? Math.round((monthUsd / dayOfMonth) * daysInMonth * 1e6) / 1e6 : monthUsd

  return {
    tier,
    limits: { rpm: limits.rpm, rpd: limits.rpd, tpm: limits.tpm },
    daily: { ...daily, requestsRemaining, percentUsed },
    minute: { requests: minute.requests, totalTokens: minute.totalTokens, rpmRemaining, percentRpm, tpmRemaining, percentTpm },
    month,
    reset: { dailyAtIso: resetAt.toISOString(), dailyInMs: msUntilReset, timezone: "America/Los_Angeles" },
    cost: {
      perMillion: PRICING_PER_MILLION,
      todayUsd,
      monthUsd,
      projectedMonthUsd,
      isFree: tier === "free",
      currency: "USD",
    },
    lastCall: lastR.rows[0]
      ? {
          at: lastR.rows[0].created_at as string,
          totalTokens: Number(lastR.rows[0].total_tokens ?? 0),
          endpoint: (lastR.rows[0].endpoint as string) ?? null,
        }
      : null,
  }
}
