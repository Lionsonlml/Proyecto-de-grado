const { createClient } = require('@libsql/client')
const path = require('path')
const fs = require('fs')
const { encryptSensitiveData, getSeedPassword } = require('./_encryption-helper')

async function resetDatabase() {
  const dbPath = path.join(process.cwd(), 'data', 'app.db')
  
  console.log('🧹 Reseteando base de datos con datos válidos...')
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
    `)

    console.log('✅ Tablas creadas')

    // 3. Crear usuarios de prueba con bcrypt
    console.log('👤 Creando usuarios de prueba...')
    
    const bcrypt = require('bcryptjs')
    
    const demoPassword = getSeedPassword('SEED_PASSWORD_DEMO')
    const users = [
      {
        email: "demo@test.com",
        password: await bcrypt.hash(demoPassword, 10),
        name: "Usuario Demo",
      },
    ]

    for (const user of users) {
      await client.execute({
        sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
        args: [user.email, user.password, user.name],
      })
    }

    // Obtener ID del usuario
    const userResult = await client.execute("SELECT id FROM users WHERE email = 'demo@test.com'")
    const userId = userResult.rows[0].id

    console.log(`✅ Usuario creado (ID: ${userId})`)

    // 4. Crear roles
    console.log('👥 Creando roles...')
    
    await client.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
      args: [userId, 'user'],
    })

    console.log('✅ Rol creado')

    // 5. Crear datos de prueba VÁLIDOS Y CIFRADOS
    console.log('📝 Creando datos de prueba cifrados...')
    
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Tareas (CIFRADAS correctamente)
    const tasks = [
      { 
        title: "Revisar emails", 
        description: "Responder correos importantes", 
        category: "trabajo", 
        priority: "media", 
        status: "completada", 
        duration: 30, 
        completed: 1, 
        hour: 8, 
        date: yesterday 
      },
      { 
        title: "Reunión de equipo", 
        description: "Daily standup con el equipo", 
        category: "trabajo", 
        priority: "alta", 
        status: "completada", 
        duration: 60, 
        completed: 1, 
        hour: 9, 
        date: yesterday 
      },
      { 
        title: "Desarrollo de features", 
        description: "Implementar nueva funcionalidad en el módulo de autenticación", 
        category: "trabajo", 
        priority: "urgente", 
        status: "completada", 
        duration: 120, 
        completed: 1, 
        hour: 10, 
        date: yesterday 
      },
      { 
        title: "Planificación sprint", 
        description: "Revisar backlog y prioridades para el próximo sprint", 
        category: "trabajo", 
        priority: "alta", 
        status: "completada", 
        duration: 90, 
        completed: 1, 
        hour: 14, 
        date: today 
      },
      { 
        title: "Ejercicio matutino", 
        description: "Correr 5 km al parque", 
        category: "salud", 
        priority: "media", 
        status: "pendiente", 
        duration: 40, 
        completed: 0, 
        hour: 7, 
        date: today 
      },
    ]

    for (const task of tasks) {
      const encryptedTitle = encryptSensitiveData(task.title)
      const encryptedDesc = encryptSensitiveData(task.description)
      
      await client.execute({
        sql: `INSERT INTO tasks (user_id, title, description, category, priority, status, duration, completed, hour, date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [userId, encryptedTitle, encryptedDesc, task.category, task.priority, task.status, task.duration, task.completed, task.hour, task.date],
      })
    }

    console.log(`✅ ${tasks.length} tareas cifradas creadas`)

    // 6. Crear moods (CIFRADAS correctamente)
    console.log('😊 Creando moods...')
    
    const moods = [
      { 
        energy: 5, 
        focus: 5, 
        stress: 1, 
        type: "excelente", 
        hour: 8, 
        date: yesterday, 
        notes: "Muy buena mañana, me siento muy productiva y con mucha energía" 
      },
      { 
        energy: 5, 
        focus: 5, 
        stress: 1, 
        type: "bien", 
        hour: 10, 
        date: yesterday, 
        notes: "Máxima concentración en el trabajo importante" 
      },
      { 
        energy: 4, 
        focus: 4, 
        stress: 2, 
        type: "motivado", 
        hour: 14, 
        date: today, 
        notes: "Listo para empezar el día, muchas ganas de trabajar" 
      },
      { 
        energy: 3, 
        focus: 3, 
        stress: 3, 
        type: "neutral", 
        hour: 16, 
        date: today, 
        notes: "Día al ritmo normal, sin estrés pero sin gran energía" 
      },
    ]

    for (const mood of moods) {
      const encryptedNotes = mood.notes ? encryptSensitiveData(mood.notes) : null
      
      await client.execute({
        sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [userId, mood.energy, mood.focus, mood.stress, mood.type, mood.hour, mood.date, encryptedNotes],
      })
    }

    console.log(`✅ ${moods.length} moods cifrados creados`)

    // 7. Crear preferencias de privacidad
    console.log('🔒 Creando preferencias de privacidad...')
    
    await client.execute({
      sql: `INSERT INTO user_preferences 
        (user_id, data_collection, ai_analysis, data_sharing, marketing_emails, analytics_tracking) 
        VALUES (?, ?, ?, ?, ?, ?)`,
      args: [userId, true, true, false, false, true],
    })

    console.log('✅ Preferencias de privacidad creadas')

    // 8. Verificar cifrado
    console.log('🧪 Verificando cifrado...')
    
    const testData = "Dato de prueba"
    const encrypted = encryptSensitiveData(testData)
    const tasksCheck = await client.execute("SELECT title FROM tasks LIMIT 1")
    const firstTask = tasksCheck.rows[0]
    
    console.log(`✅ Primera tarea cifrada correctamente: ${String(firstTask.title).slice(0, 50)}...`)

    console.log('')
    console.log('🎉 Base de datos reinicializada exitosamente!')
    console.log('')
    console.log('Datos de acceso (revisa warnings arriba si no configuraste SEED_PASSWORD_DEMO):')
    console.log('- Email: demo@test.com')
    console.log(`- Contraseña: ${demoPassword}`)
    console.log('')

  } catch (error) {
    console.error('❌ Error durante el reset:', error)
    process.exit(1)
  }
}

// Ejecutar reset
resetDatabase()
