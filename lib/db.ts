import { createClient, Client } from "@libsql/client"
import { hash } from "bcryptjs"
import path from "path"

const dbPath = path.join(process.cwd(), "data", "app.db")

// Variable global para mantener la instancia del cliente
let client: Client | null = null
let seedInitialized = false

// Función para obtener el cliente de la base de datos
export function getDb(): Client {
  if (!client) {
    console.log("📦 Inicializando cliente de base de datos...")
    client = createClient({
      url: `file:${dbPath}`,
    })
    
    // Inicializar tablas
    initializeTables()
  }
  return client
}

// Función para inicializar las tablas
function initializeTables() {
  const db = getDb()
  
  console.log("🏗️ Creando tablas...")
  
  db.executeMultiple(`
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

    CREATE INDEX IF NOT EXISTS idx_tasks_user_date ON tasks(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_moods_user_date ON moods(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_insights_user ON ai_insights(user_id);
  `)
  
  console.log("✅ Tablas creadas correctamente")
  
  // Inicializar datos de prueba
  if (!seedInitialized) {
    seedInitialized = true
    initializeSeedData().catch((error) => {
      console.error("Error inicializando datos de prueba:", error)
    })
  }
}

// Función para inicializar usuarios de prueba
export async function initializeSeedData() {
  const db = getDb()
  
  const usersResult = await db.execute("SELECT COUNT(*) as count FROM users")
  const usersCount = usersResult.rows[0]?.count as number || 0

  if (usersCount === 0) {
    console.log("🌱 Inicializando datos de prueba...")
    
    // Crear usuarios de prueba
    const users = [
      {
        email: "maria@test.com",
        password: await hash("password123", 10),
        name: "María García",
      },
      {
        email: "juan@test.com",
        password: await hash("password123", 10),
        name: "Juan Pérez",
      },
      {
        email: "admin@test.com",
        password: await hash("admin123", 10),
        name: "Admin User",
      },
    ]

    for (const user of users) {
      await db.execute({
        sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
        args: [user.email, user.password, user.name],
      })
    }

    // Obtener IDs de usuarios
    const mariaResult = await db.execute("SELECT id FROM users WHERE email = 'maria@test.com'")
    const maria = { id: mariaResult.rows[0]?.id as number }
    
    const juanResult = await db.execute("SELECT id FROM users WHERE email = 'juan@test.com'")
    const juan = { id: juanResult.rows[0]?.id as number }

    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Datos de tareas para María (perfil productivo matutino)
    const mariaTasks = [
      { user_id: maria.id, title: "Revisar emails", description: "Responder correos importantes", category: "trabajo", priority: "media", status: "completada", duration: 30, completed: 1, hour: 8, date: yesterday },
      { user_id: maria.id, title: "Reunión de equipo", description: "Daily standup", category: "trabajo", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 9, date: yesterday },
      { user_id: maria.id, title: "Desarrollo feature principal", description: "Implementar nueva funcionalidad", category: "trabajo", priority: "urgente", status: "completada", duration: 120, completed: 1, hour: 10, date: yesterday },
      { user_id: maria.id, title: "Code review", description: "Revisar PRs pendientes", category: "trabajo", priority: "media", status: "completada", duration: 45, completed: 1, hour: 14, date: yesterday },
      { user_id: maria.id, title: "Documentación", description: "Actualizar README", category: "trabajo", priority: "baja", status: "pendiente", duration: 60, completed: 0, hour: 16, date: yesterday },
      { user_id: maria.id, title: "Planificación sprint", description: "Planear siguiente sprint", category: "trabajo", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 9, date: today },
      { user_id: maria.id, title: "Implementar API", description: "Endpoints REST", category: "trabajo", priority: "urgente", status: "en-progreso", duration: 150, completed: 0, hour: 11, date: today },
      { user_id: maria.id, title: "Testing unitario", description: "Escribir tests", category: "trabajo", priority: "alta", status: "pendiente", duration: 60, completed: 0, hour: 15, date: today },
    ]

    // Datos de moods para María
    const mariaMoods = [
      { user_id: maria.id, energy: 4, focus: 5, stress: 2, type: "energético", hour: 8, date: yesterday, notes: "Muy buena mañana" },
      { user_id: maria.id, energy: 5, focus: 5, stress: 1, type: "enfocado", hour: 10, date: yesterday, notes: "Máxima concentración" },
      { user_id: maria.id, energy: 3, focus: 4, stress: 2, type: "productivo", hour: 14, date: yesterday, notes: "Bajando energía" },
      { user_id: maria.id, energy: 2, focus: 2, stress: 3, type: "cansado", hour: 16, date: yesterday, notes: "Necesito descanso" },
      { user_id: maria.id, energy: 4, focus: 4, stress: 2, type: "motivado", hour: 9, date: today, notes: "Listo para el día" },
      { user_id: maria.id, energy: 4, focus: 5, stress: 1, type: "concentrado", hour: 11, date: today, notes: "Trabajando bien" },
      { user_id: maria.id, energy: 3, focus: 3, stress: 2, type: "moderado", hour: 15, date: today, notes: "Manteniendo ritmo" },
    ]

    // Datos de tareas para Juan (perfil productivo vespertino)
    const juanTasks = [
      { user_id: juan.id, title: "Revisar pendientes", description: "Check de tareas", category: "trabajo", priority: "media", status: "completada", duration: 30, completed: 1, hour: 10, date: yesterday },
      { user_id: juan.id, title: "Reunión cliente", description: "Presentación proyecto", category: "trabajo", priority: "urgente", status: "completada", duration: 60, completed: 1, hour: 11, date: yesterday },
      { user_id: juan.id, title: "Diseño de arquitectura", description: "Diagramas sistema", category: "trabajo", priority: "alta", status: "en-progreso", duration: 90, completed: 0, hour: 14, date: yesterday },
      { user_id: juan.id, title: "Desarrollo backend", description: "API y servicios", category: "trabajo", priority: "urgente", status: "completada", duration: 180, completed: 1, hour: 15, date: yesterday },
      { user_id: juan.id, title: "Debugging", description: "Solucionar bugs", category: "trabajo", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 18, date: yesterday },
      { user_id: juan.id, title: "Stand-up meeting", description: "Reunión diaria", category: "trabajo", priority: "media", status: "completada", duration: 30, completed: 1, hour: 11, date: today },
      { user_id: juan.id, title: "Optimización queries", description: "Mejorar rendimiento BD", category: "trabajo", priority: "alta", status: "pendiente", duration: 120, completed: 0, hour: 14, date: today },
      { user_id: juan.id, title: "Deploy production", description: "Subir a producción", category: "trabajo", priority: "urgente", status: "pendiente", duration: 60, completed: 0, hour: 17, date: today },
    ]

    // Datos de moods para Juan
    const juanMoods = [
      { user_id: juan.id, energy: 2, focus: 2, stress: 1, type: "lento", hour: 10, date: yesterday, notes: "Empezando despacio" },
      { user_id: juan.id, energy: 3, focus: 3, stress: 2, type: "despertando", hour: 11, date: yesterday, notes: "Aún calentando" },
      { user_id: juan.id, energy: 4, focus: 4, stress: 2, type: "productivo", hour: 15, date: yesterday, notes: "Ahora sí" },
      { user_id: juan.id, energy: 5, focus: 5, stress: 1, type: "enfocado", hour: 18, date: yesterday, notes: "Peak performance" },
      { user_id: juan.id, energy: 3, focus: 3, stress: 2, type: "moderado", hour: 11, date: today, notes: "Normal" },
      { user_id: juan.id, energy: 5, focus: 4, stress: 1, type: "energético", hour: 14, date: today, notes: "Subiendo nivel" },
      { user_id: juan.id, energy: 5, focus: 5, stress: 1, type: "peak", hour: 17, date: today, notes: "Máximo rendimiento" },
    ]

    for (const task of [...mariaTasks, ...juanTasks]) {
      await db.execute({
        sql: `INSERT INTO tasks (user_id, title, description, category, priority, status, duration, completed, hour, date) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [task.user_id, task.title, task.description, task.category, task.priority, task.status, task.duration, task.completed, task.hour, task.date],
      })
    }

    for (const mood of [...mariaMoods, ...juanMoods]) {
      await db.execute({
        sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [mood.user_id, mood.energy, mood.focus, mood.stress, mood.type, mood.hour, mood.date, mood.notes || null],
      })
    }

    console.log("✅ Datos de prueba inicializados")
  }
}

export default getDb
