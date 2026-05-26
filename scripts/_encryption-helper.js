/**
 * Helper compartido de cifrado para scripts de migración/seed.
 *
 * Diseño:
 *  - Algoritmo idéntico al de lib/encryption.ts (AES-256-CBC + scrypt KDF).
 *  - SIN clave por defecto hardcodeada: si ENCRYPTION_KEY no está en el entorno,
 *    el script falla rápido y explícitamente (mejor que cifrar con clave débil).
 *  - El salt es constante por compatibilidad con datos ya cifrados. La seguridad
 *    descansa en la entropía de ENCRYPTION_KEY (32+ bytes aleatorios), no en el salt.
 */

const crypto = require('crypto')

const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16
// Constante intencional: cambiarla invalidaría todos los datos previamente cifrados.
// La fortaleza criptográfica está garantizada por la entropía de ENCRYPTION_KEY.
const SCRYPT_SALT = 'salt'

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
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(String(data), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

function decryptSensitiveData(encryptedData) {
  if (encryptedData == null) return encryptedData
  const str = String(encryptedData)
  if (!str.includes(':') || str.split(':').length !== 2) {
    return str
  }
  try {
    const key = getEncryptionKey()
    const parts = str.split(':')
    const iv = Buffer.from(parts[0], 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    let decrypted = decipher.update(parts[1], 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    console.error('Error descifrando datos:', err.message)
    return '[Datos no disponibles]'
  }
}

/**
 * Lee una contraseña de seed desde variable de entorno o genera una aleatoria.
 * Las contraseñas hardcodeadas en código fuente son una vulnerabilidad de seguridad.
 */
function getSeedPassword(envVarName) {
  const fromEnv = process.env[envVarName]
  if (fromEnv && fromEnv.length >= 8) return fromEnv
  // Si no se provee, generar una aleatoria y loguearla para que el dev la guarde
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
  ALGORITHM,
  KEY_LENGTH,
  IV_LENGTH,
}
