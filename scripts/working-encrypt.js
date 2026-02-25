const { createClient } = require('@libsql/client')
const path = require('path')
const crypto = require('crypto')
const fs = require('fs')

// Configuración de cifrado que funciona en todas las versiones de Node.js
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

async function resetAndEncrypt() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🔄 Reseteando base de datos y creando datos cifrados...')
  console.log('')

  try {
    // 1. Eliminar base de datos existente
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      console.log('🗑️  Base de datos anterior eliminada')
    }

    // 2. Crear nueva base de datos
    const client = createClient({
      url: `file:${dbPath}`,
    })

    console.log('🏗️  Creando tablas...')
    
    // Crear todas las tablas
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'personal',
        priority TEXT DEFAULT 'media',
        status TEXT DEFAULT 'pendiente',
        duration INTEGER DEFAULT 60,
        completed INTEGER DEFAULT 0,
        hour INTEGER DEFAULT 9,
        date TEXT NOT NULL,
        due_date TEXT,
        tags TEXT,
        started_at DATETIME,
        time_elapsed INTEGER DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS moods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        energy INTEGER NOT NULL CHECK (energy >= 1 AND energy <= 5),
        focus INTEGER DEFAULT 3 CHECK (focus >= 1 AND focus <= 5),
        stress INTEGER DEFAULT 3 CHECK (stress >= 1 AND stress <= 5),
        type TEXT NOT NULL,
        hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
        date TEXT NOT NULL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS ai_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        analysis_type TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        data_collection BOOLEAN DEFAULT FALSE,
        ai_analysis BOOLEAN DEFAULT FALSE,
        data_sharing BOOLEAN DEFAULT FALSE,
        marketing_emails BOOLEAN DEFAULT FALSE,
        analytics_tracking BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS consents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        scope TEXT NOT NULL,
        accepted BOOLEAN NOT NULL,
        version TEXT NOT NULL,
        accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS data_access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        data_type TEXT NOT NULL,
        target_user_id INTEGER,
        ip_address TEXT,
        user_agent TEXT,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_insights_user ON ai_insights(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
      CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_user ON data_access_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_data_access_logs_accessed ON data_access_logs(accessed_at);
    `)

    console.log('✅ Tablas creadas')

    // 3. Crear usuarios de prueba con contraseñas hasheadas
    console.log('👤 Creando usuarios de prueba...')
    
    const bcrypt = require('bcryptjs')
    
    const users = [
      {
        email: "maria@test.com",
        password: await bcrypt.hash("password123", 10),
        name: "María García",
      },
      {
        email: "juan@test.com",
        password: await bcrypt.hash("password123", 10),
        name: "Juan Pérez",
      },
      {
        email: "admin@test.com",
        password: await bcrypt.hash("admin123", 10),
        name: "Admin User",
      },
    ]

    for (const user of users) {
      await client.execute({
        sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
        args: [user.email, user.password, user.name],
      })
    }

    // Obtener IDs de usuarios
    const mariaResult = await client.execute("SELECT id FROM users WHERE email = 'maria@test.com'")
    const maria = { id: mariaResult.rows[0]?.id }
    
    const juanResult = await client.execute("SELECT id FROM users WHERE email = 'juan@test.com'")
    const juan = { id: juanResult.rows[0]?.id }

    const adminResult = await client.execute("SELECT id FROM users WHERE email = 'admin@test.com'")
    const admin = { id: adminResult.rows[0]?.id }

    console.log('✅ Usuarios creados')

    // 4. Crear roles
    console.log('👥 Creando roles...')
    
    await client.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
      args: [maria.id, 'user'],
    })
    
    await client.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
      args: [juan.id, 'user'],
    })
    
    await client.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
      args: [admin.id, 'admin'],
    })

    console.log('✅ Roles creados')

    // 5. Crear datos de prueba CIFRADOS
    console.log('📝 Creando datos de prueba cifrados...')
    
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Tareas para María (CIFRADAS)
    const mariaTasks = [
      { 
        user_id: maria.id, 
        title: encryptSensitiveData("Revisar emails"), 
        description: encryptSensitiveData("Responder correos importantes"), 
        category: "trabajo", 
        priority: "media", 
        status: "completada", 
        duration: 30, 
        completed: 1, 
        hour: 8, 
        date: yesterday 
      },
      { 
        user_id: maria.id, 
        title: encryptSensitiveData("Reunión de equipo"), 
        description: encryptSensitiveData("Daily standup"), 
        category: "trabajo", 
        priority: "alta", 
        status: "completada", 
        duration: 60, 
        completed: 1, 
        hour: 9, 
        date: yesterday 
      },
      { 
        user_id: maria.id, 
        title: encryptSensitiveData("Desarrollo feature principal"), 
        description: encryptSensitiveData("Implementar nueva funcionalidad"), 
        category: "trabajo", 
        priority: "urgente", 
        status: "completada", 
        duration: 120, 
        completed: 1, 
        hour: 10, 
        date: yesterday 
      },
      { 
        user_id: maria.id, 
        title: encryptSensitiveData("Planificación sprint"), 
        description: encryptSensitiveData("Planear siguiente sprint"), 
        category: "trabajo", 
        priority: "alta", 
        status: "completada", 
        duration: 90, 
        completed: 1, 
        hour: 9, 
        date: today 
      },
    ]

    for (const task of mariaTasks) {
      await client.execute({
        sql: `INSERT INTO tasks (user_id, title, description, category, priority, status, duration, completed, hour, date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [task.user_id, task.title, task.description, task.category, task.priority, task.status, task.duration, task.completed, task.hour, task.date],
      })
    }

    // Moods para María (CIFRADOS)
    const mariaMoods = [
      { 
        user_id: maria.id, 
        energy: 4, 
        focus: 5, 
        stress: 2, 
        type: "energético", 
        hour: 8, 
        date: yesterday, 
        notes: encryptSensitiveData("Muy buena mañana") 
      },
      { 
        user_id: maria.id, 
        energy: 5, 
        focus: 5, 
        stress: 1, 
        type: "enfocado", 
        hour: 10, 
        date: yesterday, 
        notes: encryptSensitiveData("Máxima concentración") 
      },
      { 
        user_id: maria.id, 
        energy: 4, 
        focus: 4, 
        stress: 2, 
        type: "motivado", 
        hour: 9, 
        date: today, 
        notes: encryptSensitiveData("Listo para el día") 
      },
    ]

    for (const mood of mariaMoods) {
      await client.execute({
        sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [mood.user_id, mood.energy, mood.focus, mood.stress, mood.type, mood.hour, mood.date, mood.notes],
      })
    }

    console.log('✅ Datos de prueba cifrados creados')

    // 6. Crear preferencias de privacidad por defecto
    console.log('🔒 Creando preferencias de privacidad...')
    
    for (const userId of [maria.id, juan.id, admin.id]) {
      await client.execute({
        sql: `INSERT INTO user_preferences 
          (user_id, data_collection, ai_analysis, data_sharing, marketing_emails, analytics_tracking) 
          VALUES (?, ?, ?, ?, ?, ?)`,
        args: [userId, true, true, false, false, true],
      })
    }

    console.log('✅ Preferencias de privacidad creadas')

    console.log('')
    console.log('🎉 Base de datos reseteada y cifrada exitosamente!')
    console.log('')
    console.log('Datos de prueba:')
    console.log('- maria@test.com / password123')
    console.log('- juan@test.com / password123') 
    console.log('- admin@test.com / admin123')
    console.log('')
    console.log('IMPORTANTE:')
    console.log('1. Configura ENCRYPTION_KEY en tu archivo .env.local')
    console.log('2. Reinicia la aplicación')
    console.log('3. Los datos ya están cifrados desde el inicio')
    console.log('')
    console.log('Para verificar la seguridad, ejecuta:')
    console.log('node scripts/verify-security.js')

  } catch (error) {
    console.error('❌ Error durante el reset:', error)
    process.exit(1)
  }
}

// Ejecutar reset
resetAndEncrypt()
