import crypto from 'crypto'

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32 // 256 bits
const IV_LENGTH = 16 // 128 bits

// Generar una clave de cifrado desde la variable de entorno
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

// Cifrar datos sensibles
export function encryptSensitiveData(data: string): string {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Combinar IV y datos cifrados
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Error cifrando datos:', error)
    throw new Error('Error al cifrar datos sensibles')
  }
}

// Descifrar datos sensibles
export function decryptSensitiveData(encryptedData: string): string {
  try {
    // Si no está cifrado, devolver tal como está
    if (!isEncrypted(encryptedData)) {
      return encryptedData
    }

    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
    if (parts.length !== 2) {
      console.warn('Formato de datos cifrados inválido, devolviendo datos originales')
      return encryptedData
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]

    // Validar que IV y payload tienen formato hex válido y longitudes esperadas
    const ivHex = parts[0]
    const payloadHex = parts[1]

    const hexRegex = /^[0-9a-fA-F]+$/
    if (ivHex.length !== IV_LENGTH * 2 || !hexRegex.test(ivHex) || !hexRegex.test(payloadHex)) {
      console.warn('Datos cifrados con formato inesperado; devolviendo datos originales')
      return encryptedData
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)

    let decrypted = ''
    try {
      decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
    } catch (err) {
      // No propagar errores de descifrado (clave inválida, datos corruptos, etc.)
      console.error('Error descifrando datos:', (err as Error).message)
      return '[Datos no disponibles]'
    }

    return decrypted
  } catch (error) {
    console.error('Error inesperado en decryptSensitiveData:', (error as Error).message)
    return '[Datos no disponibles]'
  }
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
export function isEncrypted(data: string): boolean {
  if (!data || typeof data !== 'string') return false

  // Formato esperado: iv_hex:ciphertext_hex
  const parts = data.split(':')
  if (parts.length !== 2) return false

  const [ivHex, payloadHex] = parts
  const hexRegex = /^[0-9a-fA-F]+$/
  if (!hexRegex.test(ivHex) || !hexRegex.test(payloadHex)) return false
  // IV debe tener tamaño IV_LENGTH bytes -> hex length = IV_LENGTH*2
  if (ivHex.length !== IV_LENGTH * 2) return false

  return true
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
