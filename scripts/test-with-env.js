// Las variables de entorno deben venir del entorno real (NO hardcodearlas).
// Para ejecutar localmente:
//   PowerShell:  $env:ENCRYPTION_KEY="..."; node scripts/test-with-env.js
//   Bash:        ENCRYPTION_KEY=... node scripts/test-with-env.js
if (!process.env.ENCRYPTION_KEY) {
  console.error('❌ ENCRYPTION_KEY no está configurada. Define la variable de entorno antes de ejecutar.')
  process.exit(1)
}

const { createClient } = require('@libsql/client')
const path = require('path')
const { encryptSensitiveData, decryptSensitiveData } = require('./_encryption-helper')

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
