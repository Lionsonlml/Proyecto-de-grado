import crypto from 'crypto'

// ─── Configuración ────────────────────────────────────────────────────────────
// Nuevo cifrado: AES-256-GCM (AEAD — autenticación + cifrado en una sola operación)
const GCM_ALGORITHM = 'aes-256-gcm'
const GCM_IV_LENGTH = 12 // recomendado para GCM (96 bits)
const GCM_AUTHTAG_LENGTH = 16 // 128 bits

// Legacy: AES-256-CBC. Solo para LEER datos antiguos. Las nuevas escrituras
// usan GCM. Cuando todos los datos se hayan re-cifrado, este bloque puede
// eliminarse junto con la decryptLegacyCBC().
const LEGACY_CBC_ALGORITHM = 'aes-256-cbc'
const LEGACY_CBC_IV_LENGTH = 16

const KEY_LENGTH = 32 // 256 bits

// Salt constante intencional. La entropía de ENCRYPTION_KEY garantiza
// la fortaleza; cambiarlo invalidaría datos previos.
const SCRYPT_SALT = 'salt'

// Prefijo de versión para distinguir formato GCM (nuevo) de CBC (legacy)
const GCM_VERSION_PREFIX = 'v2:'

// ─── Helpers de clave ─────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 16) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required (min 16 chars). ' +
      'Set it in your environment before starting the app.'
    )
  }
  return crypto.scryptSync(key, SCRYPT_SALT, KEY_LENGTH)
}

// ─── Cifrado: SIEMPRE AES-256-GCM (autenticado) ──────────────────────────────

export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(GCM_IV_LENGTH)
    const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv)

    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag()

    // Formato: v2:<iv-hex>:<authTag-hex>:<ciphertext-hex>
    return `${GCM_VERSION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  } catch (error) {
    console.error('Error cifrando datos:', error)
    throw new Error('Error al cifrar datos sensibles')
  }
}

// ─── Descifrado: detecta formato GCM vs CBC legacy ──────────────────────────

export function decryptSensitiveData(encryptedData: string): string {
  try {
    if (!encryptedData || typeof encryptedData !== 'string') return encryptedData

    // ── Formato nuevo: AES-256-GCM ──
    if (encryptedData.startsWith(GCM_VERSION_PREFIX)) {
      return decryptGCM(encryptedData)
    }

    // ── Formato legacy: AES-256-CBC ──
    // Solo se mantiene para leer datos antiguos. Se elimina cuando ya
    // no queden datos cifrados con el formato anterior.
    if (isLegacyCBCFormat(encryptedData)) {
      return decryptLegacyCBC(encryptedData)
    }

    // No cifrado o formato no reconocido: devolver tal cual
    return encryptedData
  } catch (error) {
    console.error('Error inesperado en decryptSensitiveData:', (error as Error).message)
    return '[Datos no disponibles]'
  }
}

// ─── Descifrado GCM ──────────────────────────────────────────────────────────

function decryptGCM(encryptedData: string): string {
  try {
    const payload = encryptedData.slice(GCM_VERSION_PREFIX.length)
    const parts = payload.split(':')
    if (parts.length !== 3) {
      console.warn('Formato GCM inválido')
      return '[Datos no disponibles]'
    }

    const [ivHex, authTagHex, ciphertextHex] = parts
    const hexRegex = /^[0-9a-fA-F]+$/

    if (
      ivHex.length !== GCM_IV_LENGTH * 2 ||
      authTagHex.length !== GCM_AUTHTAG_LENGTH * 2 ||
      !hexRegex.test(ivHex) ||
      !hexRegex.test(authTagHex) ||
      !hexRegex.test(ciphertextHex)
    ) {
      console.warn('Formato GCM con longitudes inesperadas')
      return '[Datos no disponibles]'
    }

    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Error descifrando GCM:', (err as Error).message)
    return '[Datos no disponibles]'
  }
}

// ─── Descifrado legacy CBC (compatibilidad hacia atrás) ─────────────────────
// NOTA DE SEGURIDAD: AES-CBC no provee autenticación. Esta función SOLO
// se usa para leer datos previamente cifrados con la versión anterior. Las
// nuevas escrituras usan GCM (ver encryptSensitiveData). Se eliminará cuando
// todos los datos legacy hayan migrado tras una pasada de re-encriptación. // NOSONAR
function decryptLegacyCBC(encryptedData: string): string {
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 2) return '[Datos no disponibles]'

    const [ivHex, payloadHex] = parts
    const hexRegex = /^[0-9a-fA-F]+$/
    if (
      ivHex.length !== LEGACY_CBC_IV_LENGTH * 2 ||
      !hexRegex.test(ivHex) ||
      !hexRegex.test(payloadHex)
    ) {
      return '[Datos no disponibles]'
    }

    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    // NOSONAR: legacy decryption path — see comment above
    const decipher = crypto.createDecipheriv(LEGACY_CBC_ALGORITHM, key, iv)
    let decrypted = decipher.update(payloadHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Error descifrando CBC legacy:', (err as Error).message)
    return '[Datos no disponibles]'
  }
}

function isLegacyCBCFormat(data: string): boolean {
  if (!data || typeof data !== 'string') return false
  const parts = data.split(':')
  if (parts.length !== 2) return false
  const [ivHex, payloadHex] = parts
  const hexRegex = /^[0-9a-fA-F]+$/
  return (
    ivHex.length === LEGACY_CBC_IV_LENGTH * 2 &&
    hexRegex.test(ivHex) &&
    hexRegex.test(payloadHex)
  )
}

// Cifrar campos específicos de mood (notas sensibles)
export function encryptMoodNotes(notes: string | null): string | null {
  if (!notes || notes.trim() === '') return null
  return encryptSensitiveData(notes)
}

// Descifrar campos específicos de mood
export function decryptMoodNotes(encryptedNotes: string | null): string | null {
  if (!encryptedNotes || encryptedNotes.trim() === '') return null
  return decryptSensitiveData(encryptedNotes)
}

// Cifrar datos de tareas sensibles
export function encryptTaskData(taskData: {
  title: string
  description?: string | null
  tags?: string | null
}): {
  title: string
  description: string | null
  tags: string | null
} {
  return {
    title: encryptSensitiveData(taskData.title),
    description: taskData.description ? encryptSensitiveData(taskData.description) : null,
    tags: taskData.tags ? encryptSensitiveData(taskData.tags) : null,
  }
}

// Descifrar datos de tareas sensibles
export function decryptTaskData(encryptedTaskData: {
  title: string
  description?: string | null
  tags?: string | null
}): {
  title: string
  description: string | null
  tags: string | null
} {
  return {
    title: decryptSensitiveData(encryptedTaskData.title),
    description: encryptedTaskData.description ? decryptSensitiveData(encryptedTaskData.description) : null,
    tags: encryptedTaskData.tags ? decryptSensitiveData(encryptedTaskData.tags) : null,
  }
}

// Cifrar datos de insights de IA
export function encryptInsightData(insightData: {
  prompt: string
  response: string
  metadata?: string | null
}): {
  prompt: string
  response: string
  metadata: string | null
} {
  return {
    prompt: encryptSensitiveData(insightData.prompt),
    response: encryptSensitiveData(insightData.response),
    metadata: insightData.metadata ? encryptSensitiveData(insightData.metadata) : null,
  }
}

// Descifrar datos de insights de IA
export function decryptInsightData(encryptedInsightData: {
  prompt: string
  response: string
  metadata?: string | null
}): {
  prompt: string
  response: string
  metadata: string | null
} {
  return {
    prompt: decryptSensitiveData(encryptedInsightData.prompt),
    response: decryptSensitiveData(encryptedInsightData.response),
    metadata: encryptedInsightData.metadata ? decryptSensitiveData(encryptedInsightData.metadata) : null,
  }
}

// Cifrar metadatos de insights de IA
export function encryptInsightMetadata(metadata: string | null): string | null {
  if (!metadata || metadata.trim() === '') return null
  return encryptSensitiveData(metadata)
}

// Descifrar metadatos de insights de IA
export function decryptInsightMetadata(encryptedMetadata: string | null): string | null {
  if (!encryptedMetadata || encryptedMetadata.trim() === '') return null
  return decryptSensitiveData(encryptedMetadata)
}

// Función para verificar si una cadena está cifrada
// Reconoce ambos formatos: GCM (nuevo, v2:...) y CBC (legacy, iv:ct)
export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== 'string') return false

  // Formato nuevo GCM: v2:<iv-hex>:<authTag-hex>:<ciphertext-hex>
  if (data.startsWith(GCM_VERSION_PREFIX)) {
    const payload = data.slice(GCM_VERSION_PREFIX.length)
    const parts = payload.split(':')
    if (parts.length !== 3) return false
    const [ivHex, authTagHex, ciphertextHex] = parts
    const hexRegex = /^[0-9a-fA-F]+$/
    return (
      ivHex.length === GCM_IV_LENGTH * 2 &&
      authTagHex.length === GCM_AUTHTAG_LENGTH * 2 &&
      hexRegex.test(ivHex) &&
      hexRegex.test(authTagHex) &&
      hexRegex.test(ciphertextHex)
    )
  }

  // Formato legacy CBC: <iv-hex>:<ciphertext-hex>
  return isLegacyCBCFormat(data)
}

// ─── Helpers genéricos ────────────────────────────────────────────────────────

export function encryptField(value: string | number | boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return encryptSensitiveData(String(value))
}

export function decryptField(encrypted: string | null | undefined): string | null {
  if (encrypted === null || encrypted === undefined) return null
  return decryptSensitiveData(encrypted)
}

// ─── Funciones compuestas completas para tasks ───────────────────────────────

export function encryptTaskFullData(taskData: Record<string, any>): Record<string, any> {
  const result = { ...taskData }
  // Solo cifrar campos sensibles de texto libre
  const fieldsToEncrypt = ['title', 'description', 'tags']
  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptField(result[field])
    }
  }
  return result
}

// Descifra un campo que puede estar cifrado (hex:hex) o ser texto/número plano
function safeDecryptField(v: any): any {
  if (v === null || v === undefined) return v
  if (typeof v === 'string' && isEncrypted(v)) return decryptSensitiveData(v)
  return v
}

export function decryptTaskFullData(row: Record<string, any>): Record<string, any> {
  const decText = (v: any): string | null => {
    if (v === null || v === undefined) return null
    const result = safeDecryptField(v)
    return result !== null && result !== undefined ? String(result) : null
  }
  const decInt = (v: any): number => {
    if (v === null || v === undefined) return 0
    const result = safeDecryptField(v)
    return Number.parseInt(String(result ?? '0'), 10) || 0
  }
  const decCompleted = (v: any): number => {
    if (v === null || v === undefined) return 0
    const result = safeDecryptField(v)
    return result === 1 || result === '1' || result === true || result === 'true' ? 1 : 0
  }
  return {
    ...row,
    title: decText(row.title) ?? '',
    description: row.description ? decText(row.description) : null,
    tags: row.tags ? decText(row.tags) : null,
    category: decText(row.category) ?? 'otro',
    priority: decText(row.priority) ?? 'media',
    status: decText(row.status) ?? 'pendiente',
    duration: row.duration != null ? decInt(row.duration) : null,
    completed: decCompleted(row.completed),
    hour: row.hour != null ? decInt(row.hour) : null,
    date: decText(row.date) ?? null,
    due_date: row.due_date ? decText(row.due_date) : null,
    started_at: row.started_at ? decText(row.started_at) : null,
    time_elapsed: row.time_elapsed != null ? decInt(row.time_elapsed) : null,
    completed_at: row.completed_at ? decText(row.completed_at) : null,
  }
}

// ─── Funciones compuestas completas para moods ───────────────────────────────

export function encryptMoodFullData(moodData: Record<string, any>): Record<string, any> {
  const result = { ...moodData }
  // Solo cifrar el campo de texto libre sensible (notes).
  // energy, focus, stress y hour son INTEGER con CHECK constraints en la BD
  // y NO deben cifrarse; type y date son metadatos no sensibles.
  const fieldsToEncrypt = ['notes']
  for (const field of fieldsToEncrypt) {
    if (result[field] !== undefined && result[field] !== null) {
      result[field] = encryptField(result[field])
    }
  }
  return result
}

export function decryptMoodFullData(row: Record<string, any>): Record<string, any> {
  return {
    ...row,
    // Solo notas se cifran; los demás campos se leen tal cual de la BD
    notes: row.notes ? decryptField(row.notes) : null,
    energy: row.energy != null ? Number(row.energy) || 0 : 0,
    focus: row.focus != null ? Number(row.focus) || 0 : 0,
    stress: row.stress != null ? Number(row.stress) || 0 : 0,
    type: row.type ?? null,
    hour: row.hour != null ? Number(row.hour) || 0 : null,
    date: row.date ?? null,
  }
}

// Función para limpiar datos sensibles de un objeto
export function sanitizeSensitiveData(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj
  
  const sanitized = { ...obj }
  
  // Campos que pueden contener datos sensibles
  const sensitiveFields = ['notes', 'metadata', 'description']
  
  for (const field of sensitiveFields) {
    if (sanitized[field] && typeof sanitized[field] === 'string') {
      if (isEncrypted(sanitized[field])) {
        sanitized[field] = '[Datos cifrados]'
      }
    }
  }
  
  return sanitized
}
