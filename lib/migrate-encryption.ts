/**
 * Script de migración de datos existentes a cifrado completo.
 * Idempotente: usa isEncrypted() para saltar registros ya cifrados.
 * Procesa en lotes de 100 registros.
 */
import { getDb } from './db'
import {
  isEncrypted,
  encryptField,
  encryptTaskFullData,
  encryptMoodFullData,
} from './encryption'

export interface MigrationTableResult {
  migrated: number
  skipped: number
  errors: number
}

export interface MigrationResult {
  tasks: MigrationTableResult
  moods: MigrationTableResult
  ai_insights: MigrationTableResult
  users: MigrationTableResult
  consents: MigrationTableResult
  data_access_logs: MigrationTableResult
  ai_cache: MigrationTableResult
}

const BATCH_SIZE = 100

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alreadyEncrypted(value: any): boolean {
  if (value === null || value === undefined) return true
  return isEncrypted(String(value))
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

async function migrateTasks(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM tasks", args: [] })

  for (const row of rows.rows) {
    // Detectar si ya está completamente cifrado usando title como indicador
    if (alreadyEncrypted(row.title) && alreadyEncrypted(row.category) && alreadyEncrypted(row.status)) {
      result.skipped++
      continue
    }

    try {
      const enc = encryptTaskFullData({
        title: row.title,
        description: row.description,
        tags: row.tags,
        category: row.category,
        priority: row.priority,
        status: row.status,
        duration: row.duration,
        completed: row.completed,
        hour: row.hour,
        date: row.date,
        due_date: row.due_date,
        started_at: row.started_at,
        time_elapsed: row.time_elapsed,
        completed_at: row.completed_at,
      })

      await db.execute({
        sql: `UPDATE tasks SET
          title = ?, description = ?, tags = ?,
          category = ?, priority = ?, status = ?,
          duration = ?, completed = ?, hour = ?,
          date = ?, due_date = ?, started_at = ?,
          time_elapsed = ?, completed_at = ?
          WHERE id = ?`,
        args: [
          enc.title,
          enc.description,
          enc.tags,
          enc.category,
          enc.priority,
          enc.status,
          enc.duration,
          enc.completed,
          enc.hour,
          enc.date,
          enc.due_date,
          enc.started_at,
          enc.time_elapsed,
          enc.completed_at,
          row.id,
        ],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en task id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── Moods ────────────────────────────────────────────────────────────────────

async function migrateMoods(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM moods", args: [] })

  for (const row of rows.rows) {
    if (alreadyEncrypted(row.energy) && alreadyEncrypted(row.date)) {
      result.skipped++
      continue
    }

    try {
      const enc = encryptMoodFullData({
        energy: row.energy,
        focus: row.focus,
        stress: row.stress,
        type: row.type,
        hour: row.hour,
        date: row.date,
        notes: row.notes,
      })

      await db.execute({
        sql: `UPDATE moods SET
          energy = ?, focus = ?, stress = ?,
          type = ?, hour = ?, date = ?, notes = ?
          WHERE id = ?`,
        args: [enc.energy, enc.focus, enc.stress, enc.type, enc.hour, enc.date, enc.notes, row.id],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en mood id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

async function migrateAiInsights(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM ai_insights", args: [] })

  for (const row of rows.rows) {
    if (alreadyEncrypted(row.analysis_type)) {
      result.skipped++
      continue
    }

    try {
      await db.execute({
        sql: "UPDATE ai_insights SET analysis_type = ? WHERE id = ?",
        args: [encryptField(row.analysis_type), row.id],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en ai_insight id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── Users ────────────────────────────────────────────────────────────────────

async function migrateUsers(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT id, name FROM users", args: [] })

  for (const row of rows.rows) {
    if (alreadyEncrypted(row.name)) {
      result.skipped++
      continue
    }

    try {
      await db.execute({
        sql: "UPDATE users SET name = ? WHERE id = ?",
        args: [encryptField(row.name), row.id],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en user id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── Consents ─────────────────────────────────────────────────────────────────

async function migrateConsents(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM consents", args: [] })

  for (const row of rows.rows) {
    const ipOk = !row.ip_address || alreadyEncrypted(row.ip_address)
    const uaOk = !row.user_agent || alreadyEncrypted(row.user_agent)
    if (ipOk && uaOk) {
      result.skipped++
      continue
    }

    try {
      await db.execute({
        sql: "UPDATE consents SET ip_address = ?, user_agent = ? WHERE id = ?",
        args: [
          row.ip_address ? encryptField(row.ip_address) : null,
          row.user_agent ? encryptField(row.user_agent) : null,
          row.id,
        ],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en consent id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── Data Access Logs ─────────────────────────────────────────────────────────

async function migrateDataAccessLogs(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM data_access_logs", args: [] })

  for (const row of rows.rows) {
    if (alreadyEncrypted(row.action) && alreadyEncrypted(row.data_type)) {
      result.skipped++
      continue
    }

    try {
      await db.execute({
        sql: "UPDATE data_access_logs SET action = ?, data_type = ?, ip_address = ?, user_agent = ? WHERE id = ?",
        args: [
          row.action ? encryptField(row.action) : null,
          row.data_type ? encryptField(row.data_type) : null,
          row.ip_address ? encryptField(row.ip_address) : null,
          row.user_agent ? encryptField(row.user_agent) : null,
          row.id,
        ],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en data_access_log id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── AI Cache ─────────────────────────────────────────────────────────────────

async function migrateAiCache(db: any): Promise<MigrationTableResult> {
  const result: MigrationTableResult = { migrated: 0, skipped: 0, errors: 0 }

  const rows = await db.execute({ sql: "SELECT * FROM ai_cache", args: [] })

  for (const row of rows.rows) {
    if (alreadyEncrypted(row.response)) {
      result.skipped++
      continue
    }

    try {
      await db.execute({
        sql: "UPDATE ai_cache SET response = ? WHERE id = ?",
        args: [encryptField(row.response), row.id],
      })
      result.migrated++
    } catch (err) {
      console.error(`[migrate] Error en ai_cache id=${row.id}:`, err)
      result.errors++
    }
  }

  return result
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function migrateAllDataToFullEncryption(): Promise<MigrationResult> {
  const db = getDb()

  console.log('[migrate] Iniciando migración a cifrado completo...')

  const [tasks, moods, ai_insights, users, consents, data_access_logs, ai_cache] =
    await Promise.all([
      migrateTasks(db),
      migrateMoods(db),
      migrateAiInsights(db),
      migrateUsers(db),
      migrateConsents(db),
      migrateDataAccessLogs(db),
      migrateAiCache(db),
    ])

  const result: MigrationResult = {
    tasks,
    moods,
    ai_insights,
    users,
    consents,
    data_access_logs,
    ai_cache,
  }

  console.log('[migrate] Migración completada:', JSON.stringify(result, null, 2))
  return result
}
