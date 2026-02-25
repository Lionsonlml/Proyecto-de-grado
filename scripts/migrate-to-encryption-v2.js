const { createClient } = require('@libsql/client')
const path = require('path')
const crypto = require('crypto')

// Configuración de cifrado (debe coincidir con lib/encryption.ts)
const ALGORITHM = 'aes-256-gcm'
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
    const cipher = crypto.createCipherGCM(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    return iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Error cifrando datos:', error)
    throw new Error('Error al cifrar datos sensibles')
  }
}

async function migrateData() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  const client = createClient({
    url: `file:${dbPath}`,
  })

  console.log('🔐 Iniciando migración de datos a cifrado...')
  console.log('')

  try {
    // Verificar si ya hay datos cifrados
    const checkResult = await client.execute("SELECT title FROM tasks LIMIT 1")
    if (checkResult.rows.length > 0) {
      const firstTitle = checkResult.rows[0].title
      if (firstTitle && firstTitle.includes(':') && firstTitle.split(':').length === 3) {
        console.log('⚠️  Los datos ya parecen estar cifrados.')
        console.log('   Si quieres continuar, elimina la base de datos y vuelve a crear los datos de prueba.')
        console.log('   O ejecuta: node scripts/reset-db.js')
        return
      }
    }

    // 1. Cifrar tareas existentes
    console.log('📝 Cifrando tareas...')
    const tasksResult = await client.execute("SELECT id, title, description, tags FROM tasks")
    
    for (const task of tasksResult.rows) {
      try {
        const encryptedTitle = encryptSensitiveData(task.title)
        const encryptedDescription = task.description ? encryptSensitiveData(task.description) : null
        const encryptedTags = task.tags ? encryptSensitiveData(task.tags) : null

        await client.execute({
          sql: "UPDATE tasks SET title = ?, description = ?, tags = ? WHERE id = ?",
          args: [encryptedTitle, encryptedDescription, encryptedTags, task.id],
        })
      } catch (error) {
        console.error(`Error cifrando tarea ${task.id}:`, error.message)
      }
    }

    console.log(`✅ ${tasksResult.rows.length} tareas procesadas`)

    // 2. Cifrar moods existentes
    console.log('😊 Cifrando moods...')
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL AND notes != ''")
    
    for (const mood of moodsResult.rows) {
      try {
        const encryptedNotes = encryptSensitiveData(mood.notes)

        await client.execute({
          sql: "UPDATE moods SET notes = ? WHERE id = ?",
          args: [encryptedNotes, mood.id],
        })
      } catch (error) {
        console.error(`Error cifrando mood ${mood.id}:`, error.message)
      }
    }

    console.log(`✅ ${moodsResult.rows.length} moods procesados`)

    // 3. Cifrar insights de IA existentes
    console.log('🤖 Cifrando insights de IA...')
    const insightsResult = await client.execute("SELECT id, prompt, response, metadata FROM ai_insights")
    
    for (const insight of insightsResult.rows) {
      try {
        const encryptedPrompt = encryptSensitiveData(insight.prompt)
        const encryptedResponse = encryptSensitiveData(insight.response)
        const encryptedMetadata = insight.metadata ? encryptSensitiveData(insight.metadata) : null

        await client.execute({
          sql: "UPDATE ai_insights SET prompt = ?, response = ?, metadata = ? WHERE id = ?",
          args: [encryptedPrompt, encryptedResponse, encryptedMetadata, insight.id],
        })
      } catch (error) {
        console.error(`Error cifrando insight ${insight.id}:`, error.message)
      }
    }

    console.log(`✅ ${insightsResult.rows.length} insights procesados`)

    // 4. Crear roles por defecto para usuarios existentes
    console.log('👥 Creando roles por defecto...')
    const usersResult = await client.execute("SELECT id FROM users")
    
    for (const user of usersResult.rows) {
      try {
        // Verificar si ya tiene rol
        const existingRole = await client.execute({
          sql: "SELECT id FROM user_roles WHERE user_id = ?",
          args: [user.id],
        })

        if (existingRole.rows.length === 0) {
          await client.execute({
            sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
            args: [user.id, 'user'],
          })
        }
      } catch (error) {
        console.error(`Error creando rol para usuario ${user.id}:`, error.message)
      }
    }

    console.log(`✅ ${usersResult.rows.length} roles de usuario procesados`)

    console.log('')
    console.log('🎉 Migración completada exitosamente!')
    console.log('')
    console.log('IMPORTANTE:')
    console.log('1. Configura ENCRYPTION_KEY en tu archivo .env.local')
    console.log('2. Reinicia la aplicación')
    console.log('3. Verifica que los datos se descifran correctamente en el frontend')
    console.log('')
    console.log('Para verificar la seguridad, ejecuta:')
    console.log('node scripts/verify-security.js')

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  }
}

// Ejecutar migración
migrateData()
