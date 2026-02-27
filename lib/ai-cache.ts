import { getDb } from "./db"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CachedEntry {
  response: string
  cachedAt: string
}

// ─── Clave de caché ───────────────────────────────────────────────────────────
// Formato: "{tipo}:{subtipo}:{YYYY-MM-DD}"
// Ejemplos: "analyze:patterns:2025-02-25" | "advice:task-42:2025-02-25"

export function buildCacheKey(type: string, subtype: string, date?: string): string {
  const day = date ?? new Date().toISOString().split("T")[0]
  return `${type}:${subtype}:${day}`
}

// ─── Leer del caché ───────────────────────────────────────────────────────────

export async function getCached(userId: number, key: string): Promise<CachedEntry | null> {
  try {
    const db = getDb()

    // Limpiar expirados de paso (no bloquea la respuesta)
    db.execute({
      sql: "DELETE FROM ai_cache WHERE expires_at < CURRENT_TIMESTAMP",
      args: [],
    }).catch(() => {}) // fire-and-forget

    const result = await db.execute({
      sql: `SELECT response, created_at
            FROM ai_cache
            WHERE user_id = ? AND cache_key = ? AND expires_at > CURRENT_TIMESTAMP
            LIMIT 1`,
      args: [userId, key],
    })

    if (result.rows.length === 0) return null

    return {
      response: result.rows[0].response as string,
      cachedAt: result.rows[0].created_at as string,
    }
  } catch {
    // El caché nunca debe romper el flujo principal
    return null
  }
}

// ─── Escribir al caché ────────────────────────────────────────────────────────

export async function setCached(
  userId: number,
  key: string,
  response: string,
  ttlHours = 24
): Promise<void> {
  try {
    const db = getDb()
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()

    // Upsert: eliminar si existe, luego insertar
    await db.execute({
      sql: "DELETE FROM ai_cache WHERE user_id = ? AND cache_key = ?",
      args: [userId, key],
    })

    await db.execute({
      sql: "INSERT INTO ai_cache (user_id, cache_key, response, expires_at) VALUES (?, ?, ?, ?)",
      args: [userId, key, response, expiresAt],
    })
  } catch (err) {
    console.error("[AI Cache] Error escribiendo caché:", err)
  }
}

// ─── Log de fallback ──────────────────────────────────────────────────────────
// Cada uso del fallback queda registrado para estadísticas de disponibilidad (tesis)

export async function logFallback(
  userId: number,
  endpoint: string,
  reason: string,
  attempts: number
): Promise<void> {
  try {
    const db = getDb()
    await db.execute({
      sql: "INSERT INTO ai_fallback_logs (user_id, endpoint, reason, attempts) VALUES (?, ?, ?, ?)",
      args: [userId, endpoint, reason, attempts],
    })
  } catch (err) {
    console.error("[AI Cache] Error guardando fallback log:", err)
  }
}
