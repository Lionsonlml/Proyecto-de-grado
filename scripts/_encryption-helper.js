/**
 * Helper compartido de cifrado para scripts de migración/seed.
 *
 * Diseño:
 *  - Escritura: AES-256-GCM (AEAD — autenticado).
 *  - Lectura: detecta automáticamente formato GCM (nuevo, "v2:...") o
 *    formato CBC legacy ("iv:ciphertext") para compatibilidad con datos
 *    previamente cifrados. El descifrado CBC solo se mantiene mientras
 *    quedan datos en formato antiguo.
 *  - SIN clave por defecto hardcodeada: si ENCRYPTION_KEY no está en el
 *    entorno, los scripts fallan rápido y explícitamente.
 *  - El salt del KDF es constante por compatibilidad con datos cifrados
 *    anteriormente. La seguridad descansa en la entropía de ENCRYPTION_KEY.
 */

const crypto = require('crypto')

// GCM (cifrado autenticado — usado para todas las nuevas escrituras)
const GCM_ALGORITHM = 'aes-256-gcm'
const GCM_IV_LENGTH = 12
const GCM_AUTHTAG_LENGTH = 16

// CBC legacy (solo descifrado de datos antiguos) // NOSONAR
const LEGACY_CBC_ALGORITHM = 'aes-256-cbc'
const LEGACY_CBC_IV_LENGTH = 16

const KEY_LENGTH = 32
const SCRYPT_SALT = 'salt'
const GCM_VERSION_PREFIX = 'v2:'

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length < 16) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is required (mínimo 16 caracteres). ' +
      'Configúrala en .env.local o expórtala antes de ejecutar el script.'
    )
  }
  return crypto.scryptSync(key, SCRYPT_SALT, KEY_LENGTH)
}

function encryptSensitiveData(data) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(GCM_IV_LENGTH)
  const cipher = crypto.createCipheriv(GCM_ALGORITHM, key, iv)
  let encrypted = cipher.update(String(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${GCM_VERSION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

function decryptSensitiveData(encryptedData) {
  if (encryptedData == null) return encryptedData
  const str = String(encryptedData)

  // Formato GCM nuevo
  if (str.startsWith(GCM_VERSION_PREFIX)) {
    return decryptGCM(str)
  }

  // Formato CBC legacy (compatibilidad)
  if (isLegacyCBCFormat(str)) {
    return decryptLegacyCBC(str)
  }

  // No cifrado o formato no reconocido
  return str
}

function decryptGCM(encryptedData) {
  try {
    const payload = encryptedData.slice(GCM_VERSION_PREFIX.length)
    const parts = payload.split(':')
    if (parts.length !== 3) return '[Datos no disponibles]'
    const [ivHex, authTagHex, ciphertextHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(GCM_ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Error descifrando GCM:', err.message)
    return '[Datos no disponibles]'
  }
}

// Solo lectura de datos legacy. NO se usa para escribir. // NOSONAR
function decryptLegacyCBC(encryptedData) {
  try {
    const parts = encryptedData.split(':')
    if (parts.length !== 2) return '[Datos no disponibles]'
    const [ivHex, payloadHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    // NOSONAR: legacy decryption only — new writes use GCM
    const decipher = crypto.createDecipheriv(LEGACY_CBC_ALGORITHM, key, iv)
    let decrypted = decipher.update(payloadHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Error descifrando CBC legacy:', err.message)
    return '[Datos no disponibles]'
  }
}

function isLegacyCBCFormat(data) {
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

/**
 * Lee una contraseña de seed desde variable de entorno o genera una aleatoria.
 * Las contraseñas hardcodeadas en código fuente son una vulnerabilidad.
 */
function getSeedPassword(envVarName) {
  const fromEnv = process.env[envVarName]
  if (fromEnv && fromEnv.length >= 8) return fromEnv
  const generated = crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '').slice(0, 12)
  console.warn(`[seed] ${envVarName} no configurada — generada aleatoria: ${generated}`)
  console.warn(`[seed] Guárdala o configura ${envVarName} en .env.local antes de re-ejecutar.`)
  return generated
}

module.exports = {
  encryptSensitiveData,
  decryptSensitiveData,
  getEncryptionKey,
  getSeedPassword,
}
