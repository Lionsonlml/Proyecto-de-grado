// Configurar variables de entorno antes de importar
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

const { createClient } = require('@libsql/client')
const path = require('path')
const crypto = require('crypto')

// Usar EXACTAMENTE el mismo método de cifrado que lib/encryption.ts
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
}

function encryptSensitiveData(data) {
  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
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
    // Si no está cifrado, devolver tal como está
    if (!encryptedData.includes(':') || encryptedData.split(':').length !== 2) {
      return encryptedData
    }

    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
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

async function testWithEnvironment() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🧪 Probando con variables de entorno configuradas...')
  console.log('ENCRYPTION_KEY:', process.env.ENCRYPTION_KEY)
  console.log('')

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    })

    // Probar cifrado/descifrado
    console.log('🔐 Probando cifrado/descifrado:')
    const testData = "Tarea de prueba con env"
    const encrypted = encryptSensitiveData(testData)
    const decrypted = decryptSensitiveData(encrypted)
    
    console.log(`  Datos originales: ${testData}`)
    console.log(`  Datos cifrados: ${encrypted}`)
    console.log(`  Datos descifrados: ${decrypted}`)
    console.log(`  ¿Coinciden?: ${testData === decrypted ? '✅ SÍ' : '❌ NO'}`)

    // Probar con datos de la base de datos
    console.log('\n📝 Probando con datos de la base de datos:')
    const tasksResult = await client.execute("SELECT id, title FROM tasks LIMIT 2")
    
    tasksResult.rows.forEach((task, index) => {
      console.log(`\nTarea ${index + 1}:`)
      console.log(`  ID: ${task.id}`)
      console.log(`  Título (raw): ${task.title}`)
      console.log(`  Título (descifrado): ${decryptSensitiveData(task.title)}`)
    })

  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  }
}

// Ejecutar prueba
testWithEnvironment()
