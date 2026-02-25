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

async function testFixes() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🧪 Probando correcciones...')
  console.log('')

  try {
    const client = createClient({
      url: `file:${dbPath}`,
    })

    // 1. Probar descifrado de tareas
    console.log('📝 Verificando descifrado de tareas:')
    const tasksResult = await client.execute("SELECT id, title, description FROM tasks LIMIT 3")
    
    tasksResult.rows.forEach((task, index) => {
      console.log(`\nTarea ${index + 1}:`)
      console.log(`  ID: ${task.id}`)
      console.log(`  Título (raw): ${task.title}`)
      console.log(`  Título (descifrado): ${decryptSensitiveData(task.title)}`)
      console.log(`  Descripción (raw): ${task.description}`)
      console.log(`  Descripción (descifrada): ${decryptSensitiveData(task.description)}`)
    })

    // 2. Probar descifrado de moods
    console.log('\n😊 Verificando descifrado de moods:')
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL LIMIT 3")
    
    moodsResult.rows.forEach((mood, index) => {
      console.log(`\nMood ${index + 1}:`)
      console.log(`  ID: ${mood.id}`)
      console.log(`  Notas (raw): ${mood.notes}`)
      console.log(`  Notas (descifradas): ${decryptSensitiveData(mood.notes)}`)
    })

    // 3. Simular cálculo de tendencia de moods
    console.log('\n📊 Simulando cálculo de tendencia de moods:')
    const allMoodsResult = await client.execute("SELECT type, energy, focus, stress FROM moods ORDER BY created_at DESC LIMIT 7")
    
    if (allMoodsResult.rows.length > 0) {
      const moodValues = { "muy-mal": 1, mal: 2, neutral: 3, bien: 4, excelente: 5 }
      
      // Convertir tipos de mood a valores numéricos
      const moodNumericValues = allMoodsResult.rows.map(mood => {
        const type = mood.type.toLowerCase()
        if (type.includes("excelente") || type.includes("enfocado") || type.includes("energético")) return 5
        if (type.includes("bien") || type.includes("productivo") || type.includes("motivado")) return 4
        if (type.includes("mal") || type.includes("cansado") || type.includes("lento")) return 2
        if (type.includes("muy")) return 1
        return 3
      })
      
      const avgMood = moodNumericValues.reduce((sum, val) => sum + val, 0) / moodNumericValues.length
      
      // Calcular tendencia (primera mitad vs segunda mitad)
      const calculateTrend = () => {
        if (moodNumericValues.length < 4) return 0
        
        const midPoint = Math.floor(moodNumericValues.length / 2)
        const firstHalf = moodNumericValues.slice(0, midPoint)
        const secondHalf = moodNumericValues.slice(midPoint)
        
        const firstHalfAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length
        const secondHalfAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length
        
        return secondHalfAvg - firstHalfAvg
      }
      
      const trend = calculateTrend()
      
      console.log(`  Promedio de mood: ${avgMood.toFixed(2)}`)
      console.log(`  Tendencia: ${trend > 0 ? 'Mejorando' : trend < 0 ? 'Bajando' : 'Estable'}`)
      console.log(`  Valores de mood: [${moodNumericValues.join(', ')}]`)
    }

    console.log('\n✅ Pruebas completadas')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
  }
}

// Ejecutar pruebas
testFixes()
