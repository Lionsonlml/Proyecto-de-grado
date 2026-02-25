#!/usr/bin/env node
/**
 * Script para resetear la BD y crear 3 usuarios de ejemplo con datos
 * - Usuario Matutino
 * - Usuario Vespertino  
 * - Usuario Nocturno
 */

const { createClient } = require('@libsql/client')
const { hash } = require('bcryptjs')
const fs = require('fs')
const path = require('path')

const dbPath = path.join(process.cwd(), 'data', 'app.db')
const dbDir = path.dirname(dbPath)

// Crear directorio data si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
  console.log('📁 Directorio data creado')
}

// Eliminar BD anterior si existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath)
  console.log('🗑️  Base de datos anterior eliminada')
}

const client = createClient({
  url: `file:${dbPath}`,
})

async function resetDatabase() {
  try {
    console.log('🏗️  Creando tablas...')
    
    // Crear tablas
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
    `)

    console.log('✅ Tablas creadas correctamente')

    const today = new Date().toISOString().split('T')[0]
    const hashedPassword = await hash('password123', 10)

    // Crear 3 usuarios
    const users = [
      {
        email: 'matutino@timewize.com',
        name: 'Usuario Matutino',
        description: 'Persona madrugadora, productiva en la mañana',
      },
      {
        email: 'vespertino@timewize.com',
        name: 'Usuario Vespertino',
        description: 'Persona vespertina, productiva en la tarde',
      },
      {
        email: 'nocturno@timewize.com',
        name: 'Usuario Nocturno',
        description: 'Persona nocturna, productiva por la noche',
      },
    ]

    console.log('👥 Creando usuarios...')

    for (const user of users) {
      await client.execute({
        sql: 'INSERT INTO users (email, password, name) VALUES (?, ?, ?)',
        args: [user.email, hashedPassword, user.name],
      })
    }

    console.log('✅ Usuarios creados:')
    users.forEach(u => console.log(`   - ${u.email} (${u.name})`))

    // Obtener IDs de usuarios
    const userResults = await client.execute('SELECT id, email FROM users')
    const userMap = {}
    userResults.rows.forEach(row => {
      userMap[row.email] = row.id
    })

    // Crear datos de ejemplo para cada usuario
    const tareas = {
      'matutino@timewize.com': [
        { title: 'Ejercicio matutino', hour: 6, duration: 45, category: 'salud' },
        { title: 'Revisión de emails', hour: 7, duration: 30, category: 'trabajo' },
        { title: 'Trabajo enfocado - Proyecto A', hour: 8, duration: 120, category: 'trabajo' },
        { title: 'Reunión con equipo', hour: 10, duration: 60, category: 'trabajo' },
        { title: 'Almuerzo', hour: 12, duration: 60, category: 'personal' },
      ],
      'vespertino@timewize.com': [
        { title: 'Desayuno relajado', hour: 9, duration: 60, category: 'personal' },
        { title: 'Tareas administrativas', hour: 11, duration: 90, category: 'trabajo' },
        { title: 'Almuerzo con cliente', hour: 13, duration: 90, category: 'trabajo' },
        { title: 'Trabajo creativo - Diseño', hour: 15, duration: 120, category: 'trabajo' },
        { title: 'Llamadas y seguimiento', hour: 17, duration: 60, category: 'trabajo' },
      ],
      'nocturno@timewize.com': [
        { title: 'Desayuno tarde', hour: 11, duration: 60, category: 'personal' },
        { title: 'Desarrollo de código', hour: 20, duration: 150, category: 'trabajo' },
        { title: 'Revisión de código', hour: 22, duration: 90, category: 'trabajo' },
        { title: 'Documentación técnica', hour: 0, duration: 120, category: 'trabajo' },
        { title: 'Lectura técnica', hour: 23, duration: 60, category: 'personal' },
      ],
    }

    const moods = {
      'matutino@timewize.com': [
        { hour: 6, type: 'excelente', energy: 5, focus: 5, stress: 1 },
        { hour: 8, type: 'bien', energy: 5, focus: 5, stress: 2 },
        { hour: 11, type: 'neutral', energy: 3, focus: 3, stress: 2 },
        { hour: 14, type: 'neutral', energy: 2, focus: 2, stress: 3 },
        { hour: 17, type: 'mal', energy: 2, focus: 2, stress: 4 },
      ],
      'vespertino@timewize.com': [
        { hour: 9, type: 'neutral', energy: 2, focus: 2, stress: 2 },
        { hour: 11, type: 'neutral', energy: 3, focus: 3, stress: 2 },
        { hour: 14, type: 'bien', energy: 4, focus: 4, stress: 1 },
        { hour: 16, type: 'excelente', energy: 5, focus: 5, stress: 1 },
        { hour: 19, type: 'bien', energy: 4, focus: 4, stress: 2 },
      ],
      'nocturno@timewize.com': [
        { hour: 11, type: 'neutral', energy: 2, focus: 2, stress: 2 },
        { hour: 14, type: 'neutral', energy: 2, focus: 2, stress: 1 },
        { hour: 18, type: 'neutral', energy: 3, focus: 3, stress: 2 },
        { hour: 20, type: 'bien', energy: 4, focus: 4, stress: 1 },
        { hour: 23, type: 'excelente', energy: 5, focus: 5, stress: 1 },
      ],
    }

    let totalTasks = 0
    let totalMoods = 0

    console.log('📋 Creando tareas de ejemplo...')

    for (const [email, taskList] of Object.entries(tareas)) {
      const userId = userMap[email]
      for (const task of taskList) {
        await client.execute({
          sql: `INSERT INTO tasks 
            (user_id, title, description, category, priority, status, duration, completed, hour, date) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            task.title,
            `${task.category} - ${task.title}`,
            task.category,
            'media',
            'pendiente',
            task.duration,
            0,
            task.hour,
            today,
          ],
        })
        totalTasks++
      }
    }

    console.log(`✅ ${totalTasks} tareas creadas`)

    console.log('😊 Creando registros de ánimo...')

    for (const [email, moodList] of Object.entries(moods)) {
      const userId = userMap[email]
      for (const mood of moodList) {
        await client.execute({
          sql: `INSERT INTO moods 
            (user_id, type, hour, energy, focus, stress, date, notes) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            userId,
            mood.type,
            mood.hour,
            mood.energy,
            mood.focus,
            mood.stress,
            today,
            `Registro de ánimo a las ${mood.hour}:00`,
          ],
        })
        totalMoods++
      }
    }

    console.log(`✅ ${totalMoods} registros de ánimo creados`)

    console.log('\n' + '='.repeat(60))
    console.log('🎉 BASE DE DATOS RESETEADA EXITOSAMENTE')
    console.log('='.repeat(60))
    console.log('\n📊 Resumen:')
    console.log(`   Usuarios:         3`)
    console.log(`   Tareas:           ${totalTasks}`)
    console.log(`   Moods:            ${totalMoods}`)
    console.log(`   Fecha:            ${today}`)
    console.log('\n🔐 Credenciales de prueba:')
    console.log('   Email:     matutino@timewize.com')
    console.log('   Email:     vespertino@timewize.com')
    console.log('   Email:     nocturno@timewize.com')
    console.log('   Password:  password123')
    console.log('\n')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error durante el reset:', error)
    process.exit(1)
  }
}

resetDatabase()
