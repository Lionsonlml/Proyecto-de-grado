const crypto = require('crypto')

// Configuración de cifrado
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production-32-chars'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

function encryptSensitiveData(data) {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Error cifrando datos:', error)
    throw new Error('Error al cifrar datos sensibles')
  }
}

function decryptSensitiveData(encryptedData) {
  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
    if (parts.length !== 2) {
      throw new Error('Formato de datos cifrados inválido')
    }
    
    const iv = Buffer.from(parts[0], 'hex')
    const encrypted = parts[1]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Error descifrando datos:', error)
    return '[Datos no disponibles]'
  }
}

// Probar el cifrado
console.log('🔐 Probando cifrado...')

const testData = "Revisar emails"
console.log('Datos originales:', testData)

const encrypted = encryptSensitiveData(testData)
console.log('Datos cifrados:', encrypted)

const decrypted = decryptSensitiveData(encrypted)
console.log('Datos descifrados:', decrypted)

if (testData === decrypted) {
  console.log('✅ Cifrado funciona correctamente!')
} else {
  console.log('❌ Error en el cifrado')
}
