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

  try {
    // 1. Cifrar tareas existentes
    console.log('📝 Cifrando tareas...')
    const tasksResult = await client.execute("SELECT id, title, description, tags FROM tasks")
    
    for (const task of tasksResult.rows) {
      const encryptedTitle = encryptSensitiveData(task.title)
      const encryptedDescription = task.description ? encryptSensitiveData(task.description) : null
      const encryptedTags = task.tags ? encryptSensitiveData(task.tags) : null

      await client.execute({
        sql: "UPDATE tasks SET title = ?, description = ?, tags = ? WHERE id = ?",
        args: [encryptedTitle, encryptedDescription, encryptedTags, task.id],
      })
    }

    console.log(`✅ ${tasksResult.rows.length} tareas cifradas`)

    // 2. Cifrar moods existentes
    console.log('😊 Cifrando moods...')
    const moodsResult = await client.execute("SELECT id, notes FROM moods WHERE notes IS NOT NULL")
    
    for (const mood of moodsResult.rows) {
      const encryptedNotes = encryptSensitiveData(mood.notes)

      await client.execute({
        sql: "UPDATE moods SET notes = ? WHERE id = ?",
        args: [encryptedNotes, mood.id],
      })
    }

    console.log(`✅ ${moodsResult.rows.length} moods cifrados`)

    // 3. Cifrar insights de IA existentes
    console.log('🤖 Cifrando insights de IA...')
    const insightsResult = await client.execute("SELECT id, prompt, response, metadata FROM ai_insights")
    
    for (const insight of insightsResult.rows) {
      const encryptedPrompt = encryptSensitiveData(insight.prompt)
      const encryptedResponse = encryptSensitiveData(insight.response)
      const encryptedMetadata = insight.metadata ? encryptSensitiveData(insight.metadata) : null

      await client.execute({
        sql: "UPDATE ai_insights SET prompt = ?, response = ?, metadata = ? WHERE id = ?",
        args: [encryptedPrompt, encryptedResponse, encryptedMetadata, insight.id],
      })
    }

    console.log(`✅ ${insightsResult.rows.length} insights cifrados`)

    // 4. Crear roles por defecto para usuarios existentes
    console.log('👥 Creando roles por defecto...')
    const usersResult = await client.execute("SELECT id FROM users")
    
    for (const user of usersResult.rows) {
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
    }

    console.log(`✅ ${usersResult.rows.length} roles de usuario creados`)

    console.log('🎉 Migración completada exitosamente!')
    console.log('')
    console.log('IMPORTANTE:')
    console.log('1. Configura ENCRYPTION_KEY en tu archivo .env.local')
    console.log('2. Reinicia la aplicación')
    console.log('3. Verifica que los datos se descifran correctamente en el frontend')

  } catch (error) {
    console.error('❌ Error durante la migración:', error)
    process.exit(1)
  }
}

// Ejecutar migración
migrateData()
