import { getDb } from './db'
import { encryptSensitiveData, decryptSensitiveData } from './encryption'

export interface UserPreferences {
  id?: number
  user_id: number
  data_collection: boolean
  ai_analysis: boolean
  data_sharing: boolean
  marketing_emails: boolean
  analytics_tracking: boolean
  created_at?: string
  updated_at?: string
}

export interface ConsentRecord {
  id?: number
  user_id: number
  scope: string
  accepted: boolean
  version: string
  accepted_at?: string
  ip_address?: string
  user_agent?: string
}

// Obtener preferencias de usuario
export async function getUserPreferences(userId: number): Promise<UserPreferences | null> {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT * FROM user_preferences WHERE user_id = ?",
    args: [userId],
  })
  
  if (result.rows.length === 0) return null
  
  const row = result.rows[0]
  return {
    id: row.id as number,
    user_id: row.user_id as number,
    data_collection: Boolean(row.data_collection),
    ai_analysis: Boolean(row.ai_analysis),
    data_sharing: Boolean(row.data_sharing),
    marketing_emails: Boolean(row.marketing_emails),
    analytics_tracking: Boolean(row.analytics_tracking),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

// Crear o actualizar preferencias de usuario
export async function saveUserPreferences(preferences: UserPreferences): Promise<void> {
  const db = getDb()
  
  const existing = await getUserPreferences(preferences.user_id)
  
  if (existing) {
    await db.execute({
      sql: `UPDATE user_preferences SET 
        data_collection = ?, 
        ai_analysis = ?, 
        data_sharing = ?, 
        marketing_emails = ?, 
        analytics_tracking = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?`,
      args: [
        preferences.data_collection,
        preferences.ai_analysis,
        preferences.data_sharing,
        preferences.marketing_emails,
        preferences.analytics_tracking,
        preferences.user_id
      ],
    })
  } else {
    await db.execute({
      sql: `INSERT INTO user_preferences 
        (user_id, data_collection, ai_analysis, data_sharing, marketing_emails, analytics_tracking) 
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        preferences.user_id,
        preferences.data_collection,
        preferences.ai_analysis,
        preferences.data_sharing,
        preferences.marketing_emails,
        preferences.analytics_tracking
      ],
    })
  }
}

// Registrar consentimiento
export async function recordConsent(consent: ConsentRecord): Promise<void> {
  const db = getDb()
  
  await db.execute({
    sql: `INSERT INTO consents 
      (user_id, scope, accepted, version, ip_address, user_agent) 
      VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      consent.user_id,
      consent.scope,
      consent.accepted,
      consent.version,
      consent.ip_address || null,
      consent.user_agent || null
    ],
  })
}

// Obtener historial de consentimientos
export async function getConsentHistory(userId: number): Promise<ConsentRecord[]> {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT * FROM consents WHERE user_id = ? ORDER BY accepted_at DESC",
    args: [userId],
  })
  
  return result.rows.map(row => ({
    id: row.id as number,
    user_id: row.user_id as number,
    scope: row.scope as string,
    accepted: Boolean(row.accepted),
    version: row.version as string,
    accepted_at: row.accepted_at as string,
    ip_address: row.ip_address as string,
    user_agent: row.user_agent as string,
  }))
}

// Verificar si el usuario ha dado consentimiento para un scope específico
export async function hasConsent(userId: number, scope: string): Promise<boolean> {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT accepted FROM consents WHERE user_id = ? AND scope = ? ORDER BY accepted_at DESC LIMIT 1",
    args: [userId, scope],
  })
  
  if (result.rows.length === 0) return false
  return Boolean(result.rows[0].accepted)
}

// Exportar todos los datos del usuario
export async function exportUserData(userId: number): Promise<any> {
  const db = getDb()
  
  // Obtener datos del usuario
  const userResult = await db.execute({
    sql: "SELECT id, email, name, created_at FROM users WHERE id = ?",
    args: [userId],
  })
  
  // Obtener tareas
  const tasksResult = await db.execute({
    sql: "SELECT * FROM tasks WHERE user_id = ?",
    args: [userId],
  })
  
  // Obtener moods (descifrar notas sensibles)
  const moodsResult = await db.execute({
    sql: "SELECT * FROM moods WHERE user_id = ?",
    args: [userId],
  })
  
  // Obtener insights de IA
  const insightsResult = await db.execute({
    sql: "SELECT * FROM ai_insights WHERE user_id = ?",
    args: [userId],
  })
  
  // Obtener preferencias
  const preferencesResult = await db.execute({
    sql: "SELECT * FROM user_preferences WHERE user_id = ?",
    args: [userId],
  })
  
  // Obtener historial de consentimientos
  const consentsResult = await db.execute({
    sql: "SELECT * FROM consents WHERE user_id = ?",
    args: [userId],
  })
  
  // Procesar moods para descifrar notas
  const processedMoods = moodsResult.rows.map(mood => {
    const moodData = { ...mood }
    if (moodData.notes && typeof moodData.notes === 'string') {
      try {
        moodData.notes = decryptSensitiveData(moodData.notes)
      } catch (error) {
        moodData.notes = '[Datos no disponibles]'
      }
    }
    return moodData
  })
  
  // Procesar insights para descifrar metadatos
  const processedInsights = insightsResult.rows.map(insight => {
    const insightData = { ...insight }
    if (insightData.metadata && typeof insightData.metadata === 'string') {
      try {
        insightData.metadata = decryptSensitiveData(insightData.metadata)
      } catch (error) {
        insightData.metadata = '[Datos no disponibles]'
      }
    }
    return insightData
  })
  
  return {
    user: userResult.rows[0],
    tasks: tasksResult.rows,
    moods: processedMoods,
    insights: processedInsights,
    preferences: preferencesResult.rows[0] || null,
    consents: consentsResult.rows,
    exported_at: new Date().toISOString(),
  }
}

// Eliminar todos los datos del usuario
export async function deleteUserData(userId: number): Promise<void> {
  const db = getDb()
  
  // Las foreign keys con CASCADE se encargan de eliminar automáticamente
  // todos los datos relacionados cuando eliminamos el usuario
  await db.execute({
    sql: "DELETE FROM users WHERE id = ?",
    args: [userId],
  })
}

// Verificar si el usuario puede acceder a datos sensibles
export async function canAccessSensitiveData(userId: number): Promise<boolean> {
  const preferences = await getUserPreferences(userId)
  return preferences ? preferences.data_collection : false
}

// Verificar si se puede usar IA para análisis
export async function canUseAIAnalysis(userId: number): Promise<boolean> {
  const preferences = await getUserPreferences(userId)
  return preferences ? preferences.ai_analysis : false
}
