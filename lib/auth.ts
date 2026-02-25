import { SignJWT, jwtVerify } from "jose"
import { compare, hash } from "bcryptjs"
import { getDb } from "./db"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

export interface UserPayload {
  id: number
  email: string
  name: string
}

export async function hashPassword(password: string): Promise<string> {
  return await hash(password, 10)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await compare(password, hashedPassword)
}

export async function createToken(payload: UserPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<UserPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as UserPayload
  } catch (error) {
    return null
  }
}

export async function getUserByEmail(email: string) {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  })
  
  if (result.rows.length === 0) return undefined
  
  const row = result.rows[0]
  return {
    id: row.id as number,
    email: row.email as string,
    password: row.password as string,
    name: row.name as string,
  }
}

export async function getUserById(id: number) {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT id, email, name FROM users WHERE id = ?",
    args: [id],
  })
  
  if (result.rows.length === 0) return undefined
  
  const row = result.rows[0]
  return {
    id: row.id as number,
    email: row.email as string,
    name: row.name as string,
  }
}

export async function createUser(email: string, hashedPassword: string, name: string) {
  const db = getDb()
  const result = await db.execute({
    sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING id",
    args: [email, hashedPassword, name],
  })
  
  return result.rows[0].id as number
}

export async function getUserTasks(userId: number, date?: string) {
  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [userId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [userId],
    })
  }
  
  return result.rows
}

export async function getUserMoods(userId: number, date?: string) {
  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT * FROM moods WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [userId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [userId],
    })
  }
  
  // Descifrar notas sensibles
  const { decryptMoodNotes } = await import('./encryption')
  
  return result.rows.map(row => ({
    ...row,
    notes: row.notes ? decryptMoodNotes(row.notes) : null,
  }))
}

export async function saveAIInsight(userId: number, prompt: string, response: string, analysisType: string, metadata?: string) {
  const db = getDb()
  
  // Cifrar metadatos sensibles si existen
  let encryptedMetadata = null
  if (metadata) {
    const { encryptInsightMetadata } = await import('./encryption')
    encryptedMetadata = encryptInsightMetadata(metadata)
  }
  
  await db.execute({
    sql: "INSERT INTO ai_insights (user_id, prompt, response, analysis_type, metadata) VALUES (?, ?, ?, ?, ?)",
    args: [userId, prompt, response, analysisType, encryptedMetadata],
  })
}

export async function getUserInsights(userId: number, limit = 20) {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT * FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
    args: [userId, limit],
  })
  
  // Descifrar metadatos sensibles
  const { decryptInsightMetadata } = await import('./encryption')
  
  return result.rows.map(row => ({
    ...row,
    metadata: row.metadata ? decryptInsightMetadata(row.metadata) : null,
  }))
}

// Función para guardar mood con cifrado de notas
export async function saveMood(userId: number, moodData: {
  energy: number
  focus: number
  stress: number
  type: string
  hour: number
  date: string
  notes?: string
}) {
  const db = getDb()
  
  // Cifrar notas sensibles si existen
  let encryptedNotes = null
  if (moodData.notes) {
    const { encryptMoodNotes } = await import('./encryption')
    encryptedNotes = encryptMoodNotes(moodData.notes)
  }
  
  await db.execute({
    sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      userId, 
      moodData.energy, 
      moodData.focus, 
      moodData.stress, 
      moodData.type, 
      moodData.hour, 
      moodData.date, 
      encryptedNotes
    ],
  })
}

// Mantener compatibilidad
export const saveGeminiInsight = saveAIInsight
