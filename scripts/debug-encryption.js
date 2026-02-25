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
      console.log('Datos no cifrados:', encryptedData)
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

async function debugDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🔍 Diagnosticando base de datos...')
  console.log('')

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    })

    // 1. Verificar tareas
    console.log('📝 Verificando tareas:')
    const tasksResult = await client.execute("SELECT id, title, description FROM tasks LIMIT 3")
    
    tasksResult.rows.forEach((task, index) => {
      console.log(`\nTarea ${index + 1}:`)
      console.log(`  ID: ${task.id}`)
      console.log(`  Título (raw): ${task.title}`)
      console.log(`  Título (descifrado): ${decryptSensitiveData(task.title)}`)
      console.log(`  Descripción (raw): ${task.description}`)
      console.log(`  Descripción (descifrada): ${decryptSensitiveData(task.description)}`)
    })

    // 2. Verificar moods
    console.log('\n😊 Verificando moods:')
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL LIMIT 3")
    
    moodsResult.rows.forEach((mood, index) => {
      console.log(`\nMood ${index + 1}:`)
      console.log(`  ID: ${mood.id}`)
      console.log(`  Notas (raw): ${mood.notes}`)
      console.log(`  Notas (descifradas): ${decryptSensitiveData(mood.notes)}`)
    })

    // 3. Probar cifrado/descifrado
    console.log('\n🧪 Probando cifrado/descifrado:')
    const testData = "Tarea de prueba"
    const encrypted = encryptSensitiveData(testData)
    const decrypted = decryptSensitiveData(encrypted)
    
    console.log(`  Datos originales: ${testData}`)
    console.log(`  Datos cifrados: ${encrypted}`)
    console.log(`  Datos descifrados: ${decrypted}`)
    console.log(`  ¿Coinciden?: ${testData === decrypted ? '✅ SÍ' : '❌ NO'}`)

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error)
  }
}

// Ejecutar diagnóstico
debugDatabase()
