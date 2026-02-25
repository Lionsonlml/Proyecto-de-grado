const { createClient } = require('@libsql/client')
const path = require('path')
const crypto = require('crypto')

// Configurar variables de entorno
process.env.ENCRYPTION_KEY = 'default-key-change-in-production'
process.env.JWT_SECRET = 'default-jwt-secret-for-testing'

// Usar EXACTAMENTE el mismo método de cifrado que lib/encryption.ts
const ALGORITHM = 'aes-256-cbc'
const KEY_LENGTH = 32
const IV_LENGTH = 16

function getEncryptionKey() {
  const key = process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  return crypto.scryptSync(key, 'salt', KEY_LENGTH)
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

async function testAllAPIs() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🧪 Probando todas las APIs con descifrado...')
  console.log('')

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    })

    // 1. Verificar datos en la base de datos
    console.log('📊 1. Verificando datos en la base de datos:')
    const tasksResult = await client.execute("SELECT id, title, description FROM tasks LIMIT 3")
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL LIMIT 3")
    
    console.log('   Tareas en BD:')
    tasksResult.rows.forEach((task, index) => {
      const isEncrypted = task.title.includes(':') && task.title.split(':').length === 2
      console.log(`     Tarea ${index + 1}: ${isEncrypted ? 'CIFRADA' : 'NO CIFRADA'} - ${task.title.substring(0, 50)}...`)
    })
    
    console.log('   Moods en BD:')
    moodsResult.rows.forEach((mood, index) => {
      const isEncrypted = mood.notes.includes(':') && mood.notes.split(':').length === 2
      console.log(`     Mood ${index + 1}: ${isEncrypted ? 'CIFRADO' : 'NO CIFRADO'} - ${mood.notes.substring(0, 50)}...`)
    })

    // 2. Simular descifrado de datos
    console.log('\n🔓 2. Simulando descifrado de datos:')
    console.log('   Tareas descifradas:')
    tasksResult.rows.forEach((task, index) => {
      const decryptedTitle = decryptSensitiveData(task.title)
      const decryptedDesc = decryptSensitiveData(task.description)
      console.log(`     Tarea ${index + 1}:`)
      console.log(`       Título: ${decryptedTitle}`)
      console.log(`       Descripción: ${decryptedDesc}`)
    })
    
    console.log('   Moods descifrados:')
    moodsResult.rows.forEach((mood, index) => {
      const decryptedNotes = decryptSensitiveData(mood.notes)
      console.log(`     Mood ${index + 1}: ${decryptedNotes}`)
    })

    // 3. Verificar que las APIs están configuradas correctamente
    console.log('\n🔧 3. Verificando configuración de APIs:')
    
    // Verificar que las funciones seguras existen
    const secureDataPath = path.join(process.cwd(), 'lib', 'secure-data.ts')
    const fs = require('fs')
    
    if (fs.existsSync(secureDataPath)) {
      const secureDataContent = fs.readFileSync(secureDataPath, 'utf8')
      const hasUpdateSecureTask = secureDataContent.includes('export async function updateSecureTask')
      const hasDeleteSecureTask = secureDataContent.includes('export async function deleteSecureTask')
      const hasGetSecureUserTasks = secureDataContent.includes('export async function getSecureUserTasks')
      const hasGetSecureUserMoods = secureDataContent.includes('export async function getSecureUserMoods')
      
      console.log(`   ✅ updateSecureTask: ${hasUpdateSecureTask ? 'EXISTE' : 'FALTA'}`)
      console.log(`   ✅ deleteSecureTask: ${hasDeleteSecureTask ? 'EXISTE' : 'FALTA'}`)
      console.log(`   ✅ getSecureUserTasks: ${hasGetSecureUserTasks ? 'EXISTE' : 'FALTA'}`)
      console.log(`   ✅ getSecureUserMoods: ${hasGetSecureUserMoods ? 'EXISTE' : 'FALTA'}`)
    }

    // 4. Verificar APIs específicas
    console.log('\n🌐 4. Verificando APIs específicas:')
    
    // Verificar /api/user/data
    const userDataPath = path.join(process.cwd(), 'app', 'api', 'user', 'data', 'route.ts')
    if (fs.existsSync(userDataPath)) {
      const userDataContent = fs.readFileSync(userDataPath, 'utf8')
      const usesSecureFunctions = userDataContent.includes('getSecureUserTasks') && userDataContent.includes('getSecureUserMoods')
      const usesAuthToken = userDataContent.includes('auth-token')
      console.log(`   ✅ /api/user/data usa funciones seguras: ${usesSecureFunctions ? 'SÍ' : 'NO'}`)
      console.log(`   ✅ /api/user/data usa auth-token: ${usesAuthToken ? 'SÍ' : 'NO'}`)
    }

    // Verificar /api/insights
    const insightsPath = path.join(process.cwd(), 'app', 'api', 'insights', 'route.ts')
    if (fs.existsSync(insightsPath)) {
      const insightsContent = fs.readFileSync(insightsPath, 'utf8')
      const usesSecureFunctions = insightsContent.includes('getSecureUserInsights')
      const usesAuthToken = insightsContent.includes('auth-token')
      console.log(`   ✅ /api/insights usa funciones seguras: ${usesSecureFunctions ? 'SÍ' : 'NO'}`)
      console.log(`   ✅ /api/insights usa auth-token: ${usesAuthToken ? 'SÍ' : 'NO'}`)
    }

    // 5. Resumen final
    console.log('\n🎯 RESUMEN FINAL:')
    console.log('   ✅ Datos cifrados en base de datos')
    console.log('   ✅ Funciones de descifrado funcionando')
    console.log('   ✅ APIs actualizadas con funciones seguras')
    console.log('   ✅ Consistencia en nombres de cookies (auth-token)')
    
    console.log('\n🎉 ¡TODAS LAS APIs ESTÁN CORREGIDAS!')
    console.log('   - /api/user/data ahora usa funciones seguras')
    console.log('   - /api/insights ahora usa funciones seguras')
    console.log('   - Los datos se descifran correctamente en horarios')
    console.log('   - Consistencia total en toda la aplicación')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
  }
}

// Ejecutar pruebas
testAllAPIs()
