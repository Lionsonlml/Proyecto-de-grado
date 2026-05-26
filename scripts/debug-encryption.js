const { createClient } = require('@libsql/client')
const path = require('path')
const { encryptSensitiveData, decryptSensitiveData } = require('./_encryption-helper')

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
