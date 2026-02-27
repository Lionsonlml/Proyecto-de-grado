import { createClient, Client } from "@libsql/client"
import { hash } from "bcryptjs"

// ─── Singleton ────────────────────────────────────────────────────────────────
// En Vercel (serverless) cada cold-start crea un nuevo proceso. Con Turso la DB
// es remota y persistente, por lo que las tablas solo se crean si no existen.

// ─── Persistencia de Singleton entre recargas de módulo (Next.js dev) ─────────
// En dev, Next.js puede re-evaluar el módulo por cada ruta compilada.
// Guardamos client e initPromise en `global` para reutilizarlos.
const g = global as {
  __dbClient?: Client
  __dbInitPromise?: Promise<void>
}

/** Devuelve el cliente de DB. La primera llamada lanza la inicialización async. */
export function getDb(): Client {
  if (!g.__dbClient) {
    g.__dbClient = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    })
    g.__dbInitPromise = initializeTables(g.__dbClient).catch((err) => {
      console.error("[DB] Error inicializando tablas:", err)
      g.__dbInitPromise = undefined // permitir reintento
    })
  }
  return g.__dbClient
}

/**
 * Espera a que las tablas estén listas antes de continuar.
 * Usar en route handlers de IA/caché donde las tablas deben existir.
 */
export async function ensureDbReady(): Promise<void> {
  getDb()
  if (g.__dbInitPromise) await g.__dbInitPromise
}

// ─── Inicialización de Tablas ─────────────────────────────────────────────────

async function initializeTables(db: Client): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.log("[DB] Creando/verificando tablas...")
  }

  await db.executeMultiple(`
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

    CREATE TABLE IF NOT EXISTS ai_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      cache_key TEXT NOT NULL,
      response TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ai_fallback_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      endpoint TEXT NOT NULL,
      reason TEXT NOT NULL,
      attempts INTEGER DEFAULT 1,
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
    CREATE INDEX IF NOT EXISTS idx_ai_cache_user_key ON ai_cache(user_id, cache_key);
    CREATE INDEX IF NOT EXISTS idx_ai_cache_expires ON ai_cache(expires_at);
    CREATE INDEX IF NOT EXISTS idx_fallback_logs_user ON ai_fallback_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_consents_user ON consents(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_access_logs_user ON data_access_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_data_access_logs_accessed ON data_access_logs(accessed_at);
  `)

  if (process.env.NODE_ENV !== "production") {
    console.log("[DB] Tablas listas")
  }

  await initializeSeedData(db)
}

// ─── Helpers de Fecha ─────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().split("T")[0]
}

// ─── Seed Maestro ─────────────────────────────────────────────────────────────
// 5 perfiles de usuario con 7 días de historial para gráficas completas en la demo

export async function initializeSeedData(db?: Client): Promise<void> {
  const database = db ?? getDb()

  const usersResult = await database.execute("SELECT COUNT(*) as count FROM users")
  const usersCount = (usersResult.rows[0]?.count as number) || 0
  if (usersCount > 0) return

  if (process.env.NODE_ENV !== "production") {
    console.log("[DB] Insertando seed maestro...")
  }

  // ── 1. Crear Usuarios ────────────────────────────────────────────────────────
  const userDefs = [
    { email: "maria@test.com",   password: await hash("password123", 10), name: "María García" },
    { email: "juan@test.com",    password: await hash("password123", 10), name: "Juan Pérez" },
    { email: "carlos@test.com",  password: await hash("password123", 10), name: "Carlos Rojas" },
    { email: "laura@test.com",   password: await hash("password123", 10), name: "Laura Mendoza" },
    { email: "admin@test.com",   password: await hash("admin123", 10),    name: "Admin User" },
  ]

  for (const u of userDefs) {
    await database.execute({
      sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
      args: [u.email, u.password, u.name],
    })
  }

  const getId = async (email: string) => {
    const r = await database.execute({ sql: "SELECT id FROM users WHERE email = ?", args: [email] })
    return r.rows[0]?.id as number
  }

  const mariaId  = await getId("maria@test.com")
  const juanId   = await getId("juan@test.com")
  const carlosId = await getId("carlos@test.com")
  const lauraId  = await getId("laura@test.com")

  // ── Helpers de inserción ─────────────────────────────────────────────────────

  const insertTask = (t: {
    user_id: number; title: string; description: string; category: string
    priority: string; status: string; duration: number; completed: number
    hour: number; date: string
  }) =>
    database.execute({
      sql: `INSERT INTO tasks (user_id, title, description, category, priority, status, duration, completed, hour, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [t.user_id, t.title, t.description, t.category, t.priority, t.status, t.duration, t.completed, t.hour, t.date],
    })

  const insertMood = (m: {
    user_id: number; energy: number; focus: number; stress: number
    type: string; hour: number; date: string; notes: string
  }) =>
    database.execute({
      sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [m.user_id, m.energy, m.focus, m.stress, m.type, m.hour, m.date, m.notes],
    })

  // ── 2. MARÍA GARCÍA — Muy productiva, matutina ───────────────────────────────
  // Patrón: energía alta 7-12h, baja paulatinamente. Alta tasa de completado.

  const mariaTasks = [
    // Día 6
    { user_id: mariaId, title: "Planificación semanal", description: "Organizar objetivos de la semana", category: "trabajo", priority: "alta", status: "completada", duration: 45, completed: 1, hour: 8, date: daysAgo(6) },
    { user_id: mariaId, title: "Ejercicio matutino", description: "Rutina de 30 minutos", category: "salud", priority: "media", status: "completada", duration: 30, completed: 1, hour: 7, date: daysAgo(6) },
    { user_id: mariaId, title: "Leer artículo de productividad", description: "Newsletter de hábitos", category: "estudio", priority: "baja", status: "completada", duration: 20, completed: 1, hour: 20, date: daysAgo(6) },
    // Día 5
    { user_id: mariaId, title: "Revisión de código frontend", description: "Code review del PR de diseño", category: "trabajo", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 9, date: daysAgo(5) },
    { user_id: mariaId, title: "Yoga y meditación", description: "Sesión de 20 minutos", category: "salud", priority: "media", status: "completada", duration: 20, completed: 1, hour: 7, date: daysAgo(5) },
    { user_id: mariaId, title: "Curso de TypeScript", description: "Módulo 4: Generics avanzados", category: "estudio", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 19, date: daysAgo(5) },
    // Día 4
    { user_id: mariaId, title: "Implementar autenticación OAuth", description: "Integración con Google y GitHub", category: "trabajo", priority: "urgente", status: "completada", duration: 180, completed: 1, hour: 10, date: daysAgo(4) },
    { user_id: mariaId, title: "Preparar presentación del sprint", description: "Slides del avance de la semana", category: "trabajo", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 14, date: daysAgo(4) },
    { user_id: mariaId, title: "Cena con familia", description: "Tiempo de calidad familiar", category: "ocio", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 19, date: daysAgo(4) },
    // Día 3
    { user_id: mariaId, title: "Reunión de equipo", description: "Retrospectiva del sprint", category: "trabajo", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 9, date: daysAgo(3) },
    { user_id: mariaId, title: "Refactorizar módulo de pagos", description: "Limpiar código legacy", category: "trabajo", priority: "media", status: "completada", duration: 120, completed: 1, hour: 11, date: daysAgo(3) },
    { user_id: mariaId, title: "Lectura de novela", description: "Tiempo personal de lectura", category: "ocio", priority: "baja", status: "completada", duration: 40, completed: 1, hour: 21, date: daysAgo(3) },
    // Día 2
    { user_id: mariaId, title: "Optimizar queries de reportes", description: "Reducir tiempo de carga del dashboard", category: "trabajo", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 8, date: daysAgo(2) },
    { user_id: mariaId, title: "Clase de cocina online", description: "Recetas saludables para la semana", category: "ocio", priority: "baja", status: "completada", duration: 60, completed: 1, hour: 16, date: daysAgo(2) },
    { user_id: mariaId, title: "Revisar metas mensuales", description: "Tracking de OKRs personales", category: "personal", priority: "media", status: "completada", duration: 30, completed: 1, hour: 20, date: daysAgo(2) },
    // Día 1 (ayer)
    { user_id: mariaId, title: "Diseño de API REST para módulo notificaciones", description: "Definir endpoints y contratos", category: "trabajo", priority: "urgente", status: "completada", duration: 120, completed: 1, hour: 9, date: daysAgo(1) },
    { user_id: mariaId, title: "Almuerzo saludable y caminata", description: "Descanso activo de mediodía", category: "salud", priority: "media", status: "completada", duration: 45, completed: 1, hour: 13, date: daysAgo(1) },
    { user_id: mariaId, title: "Documentar endpoints de la API", description: "Swagger / OpenAPI spec", category: "trabajo", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 15, date: daysAgo(1) },
    // Hoy
    { user_id: mariaId, title: "Implementar tests unitarios", description: "Cobertura al 80% en módulo auth", category: "trabajo", priority: "urgente", status: "en-progreso", duration: 150, completed: 0, hour: 9, date: daysAgo(0) },
    { user_id: mariaId, title: "Revisión de PRs pendientes", description: "3 PRs en cola de revisión", category: "trabajo", priority: "alta", status: "pendiente", duration: 60, completed: 0, hour: 14, date: daysAgo(0) },
    { user_id: mariaId, title: "Gym: piernas", description: "Entrenamiento de fuerza", category: "salud", priority: "media", status: "pendiente", duration: 60, completed: 0, hour: 18, date: daysAgo(0) },
  ]

  const mariaMoods = [
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "motivada", hour: 7, date: daysAgo(6), notes: "Café de la mañana perfecto, lista para la semana. Me siento muy motivada hoy." },
    { user_id: mariaId, energy: 4, focus: 4, stress: 2, type: "productiva", hour: 11, date: daysAgo(6), notes: "Buena concentración, avanzando bien con los objetivos." },
    { user_id: mariaId, energy: 3, focus: 3, stress: 2, type: "tranquila", hour: 20, date: daysAgo(6), notes: "Día completado, satisfecha con el avance." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "energizada", hour: 8, date: daysAgo(5), notes: "Dormí muy bien, café con leche de avena. Energía al máximo." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "concentrada", hour: 10, date: daysAgo(5), notes: "Flujo total, sin distracciones. La concentración que necesitaba para el code review." },
    { user_id: mariaId, energy: 3, focus: 4, stress: 2, type: "enfocada", hour: 19, date: daysAgo(5), notes: "Curso de TypeScript muy interesante, motivada para seguir aprendiendo." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 2, type: "motivada", hour: 9, date: daysAgo(4), notes: "Lista para una sesión larga de coding. Café doble hoy. Me siento imparable." },
    { user_id: mariaId, energy: 4, focus: 4, stress: 3, type: "productiva", hour: 14, date: daysAgo(4), notes: "Un poco de presión con la presentación pero bien manejado." },
    { user_id: mariaId, energy: 4, focus: 3, stress: 1, type: "relajada", hour: 20, date: daysAgo(4), notes: "Cena familiar cargó las pilas. Desconectada del trabajo." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "excelente", hour: 8, date: daysAgo(3), notes: "Día de retrospectiva. Energía alta, muy motivada con los logros del sprint." },
    { user_id: mariaId, energy: 4, focus: 5, stress: 2, type: "concentrada", hour: 11, date: daysAgo(3), notes: "Refactorización fluida, el café de las 10 ayudó mucho a mantener el foco." },
    { user_id: mariaId, energy: 3, focus: 2, stress: 2, type: "cansada", hour: 21, date: daysAgo(3), notes: "Cansada pero satisfecha. La lectura me ayuda a desconectar." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "motivada", hour: 7, date: daysAgo(2), notes: "Desperté antes de la alarma. Motivada para optimizar las queries lentas." },
    { user_id: mariaId, energy: 4, focus: 4, stress: 2, type: "productiva", hour: 10, date: daysAgo(2), notes: "Las optimizaciones funcionaron, 70% de mejora en rendimiento. Muy satisfecha." },
    { user_id: mariaId, energy: 3, focus: 3, stress: 1, type: "relajada", hour: 20, date: daysAgo(2), notes: "Revisé mis metas mensuales. Voy por buen camino." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 2, type: "concentrada", hour: 8, date: daysAgo(1), notes: "Café doble desde temprano. Diseño de API fluido, ideas muy claras hoy." },
    { user_id: mariaId, energy: 4, focus: 4, stress: 2, type: "productiva", hour: 13, date: daysAgo(1), notes: "Caminata del almuerzo despejó la cabeza. Lista para documentar." },
    { user_id: mariaId, energy: 3, focus: 3, stress: 3, type: "cansada", hour: 17, date: daysAgo(1), notes: "Cansada al final del día pero las tareas están completas. Satisfecha." },
    { user_id: mariaId, energy: 5, focus: 5, stress: 1, type: "motivada", hour: 8, date: daysAgo(0), notes: "Hoy toca testing. Café preparado, lista para escribir tests toda la mañana. Me encanta el TDD." },
    { user_id: mariaId, energy: 4, focus: 4, stress: 2, type: "concentrada", hour: 12, date: daysAgo(0), notes: "Tests avanzando bien, cobertura subiendo. El café de las 11 me mantiene en foco." },
  ]

  // ── 3. JUAN PÉREZ — Productivo vespertino ────────────────────────────────────
  // Patrón: energía baja por la mañana, pico 15-21h. Trabajo tardío.

  const juanTasks = [
    // Día 6
    { user_id: juanId, title: "Revisar emails atrasados", description: "Inbox de la semana pasada", category: "trabajo", priority: "media", status: "completada", duration: 30, completed: 1, hour: 11, date: daysAgo(6) },
    { user_id: juanId, title: "Diseño de arquitectura de microservicios", description: "Diagrama de componentes del sistema", category: "trabajo", priority: "urgente", status: "completada", duration: 180, completed: 1, hour: 15, date: daysAgo(6) },
    { user_id: juanId, title: "Gaming con amigos", description: "Partidas online de fin de semana", category: "ocio", priority: "baja", status: "completada", duration: 120, completed: 1, hour: 20, date: daysAgo(6) },
    // Día 5
    { user_id: juanId, title: "Stand-up tardío", description: "Reunión de equipo 11am", category: "trabajo", priority: "alta", status: "completada", duration: 30, completed: 1, hour: 11, date: daysAgo(5) },
    { user_id: juanId, title: "Implementar API GraphQL", description: "Resolvers para módulo de usuarios", category: "trabajo", priority: "urgente", status: "completada", duration: 240, completed: 1, hour: 15, date: daysAgo(5) },
    // Día 4
    { user_id: juanId, title: "Debugging producción", description: "Error crítico en API de pagos", category: "trabajo", priority: "urgente", status: "completada", duration: 120, completed: 1, hour: 16, date: daysAgo(4) },
    { user_id: juanId, title: "Natación", description: "Piscina del barrio", category: "salud", priority: "media", status: "completada", duration: 60, completed: 1, hour: 19, date: daysAgo(4) },
    { user_id: juanId, title: "Ver serie favorita", description: "Episodios pendientes de Breaking Bad", category: "ocio", priority: "baja", status: "completada", duration: 120, completed: 1, hour: 22, date: daysAgo(4) },
    // Día 3
    { user_id: juanId, title: "Revisión de seguridad API", description: "Audit de endpoints públicos", category: "trabajo", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 14, date: daysAgo(3) },
    { user_id: juanId, title: "Implementar rate limiting", description: "Redis para control de cuota", category: "trabajo", priority: "alta", status: "completada", duration: 120, completed: 1, hour: 17, date: daysAgo(3) },
    // Día 2
    { user_id: juanId, title: "Optimización de base de datos", description: "Índices y query analysis", category: "trabajo", priority: "alta", status: "completada", duration: 150, completed: 1, hour: 15, date: daysAgo(2) },
    { user_id: juanId, title: "Curso de Kubernetes", description: "Módulo de deployments", category: "estudio", priority: "media", status: "completada", duration: 90, completed: 1, hour: 20, date: daysAgo(2) },
    // Ayer
    { user_id: juanId, title: "Reunión con cliente internacional", description: "Demo del sistema en inglés", category: "trabajo", priority: "urgente", status: "completada", duration: 60, completed: 1, hour: 15, date: daysAgo(1) },
    { user_id: juanId, title: "Documentar arquitectura GraphQL", description: "Wiki del equipo técnico", category: "trabajo", priority: "media", status: "completada", duration: 90, completed: 1, hour: 18, date: daysAgo(1) },
    // Hoy
    { user_id: juanId, title: "Code review GraphQL de junior", description: "Revisar implementación de resolvers", category: "trabajo", priority: "alta", status: "pendiente", duration: 60, completed: 0, hour: 14, date: daysAgo(0) },
    { user_id: juanId, title: "Deploy a producción", description: "Release v2.3.0 con nuevas features", category: "trabajo", priority: "urgente", status: "pendiente", duration: 90, completed: 0, hour: 17, date: daysAgo(0) },
    { user_id: juanId, title: "Práctica de inglés técnico", description: "Preparar presentación para cliente EEUU", category: "estudio", priority: "alta", status: "en-progreso", duration: 60, completed: 0, hour: 20, date: daysAgo(0) },
  ]

  const juanMoods = [
    { user_id: juanId, energy: 1, focus: 2, stress: 1, type: "lento", hour: 9, date: daysAgo(6), notes: "No soy persona de mañanas. Todavía no me funciona el cerebro, esperando que el café haga efecto." },
    { user_id: juanId, energy: 3, focus: 3, stress: 1, type: "despertando", hour: 12, date: daysAgo(6), notes: "El café de las 11 empezó a hacer efecto. Calentando motores." },
    { user_id: juanId, energy: 5, focus: 5, stress: 1, type: "peak", hour: 16, date: daysAgo(6), notes: "Aquí está mi momento del día. Diseñando a máxima velocidad, en estado de flow total." },
    { user_id: juanId, energy: 2, focus: 2, stress: 1, type: "lento", hour: 10, date: daysAgo(5), notes: "Otro día lento por la mañana. Necesito el café para arrancar el sistema." },
    { user_id: juanId, energy: 4, focus: 4, stress: 2, type: "concentrado", hour: 15, date: daysAgo(5), notes: "Por fin en marcha. GraphQL fluye bien a esta hora, es cuando mejor pienso." },
    { user_id: juanId, energy: 5, focus: 5, stress: 1, type: "productivo", hour: 19, date: daysAgo(5), notes: "Máximo rendimiento nocturno. Podría programar hasta las 2am en este estado." },
    { user_id: juanId, energy: 2, focus: 1, stress: 3, type: "estresado", hour: 11, date: daysAgo(4), notes: "Empezó el día con un bug crítico en producción. Mucho estrés desde temprano." },
    { user_id: juanId, energy: 4, focus: 5, stress: 3, type: "enfocado", hour: 17, date: daysAgo(4), notes: "Bug resuelto. La presión paradójicamente me ayudó a concentrarme más." },
    { user_id: juanId, energy: 5, focus: 4, stress: 1, type: "relajado", hour: 20, date: daysAgo(4), notes: "Natación fue lo mejor del día. Totalmente desconectado del estrés de la mañana." },
    { user_id: juanId, energy: 2, focus: 2, stress: 2, type: "lento", hour: 10, date: daysAgo(3), notes: "Normal para mis mañanas. Café en mano, esperando que despierte el cerebro." },
    { user_id: juanId, energy: 5, focus: 5, stress: 1, type: "concentrado", hour: 15, date: daysAgo(3), notes: "El audit de seguridad requiere concentración total. Tengo exactamente eso ahora." },
    { user_id: juanId, energy: 5, focus: 5, stress: 1, type: "peak", hour: 18, date: daysAgo(3), notes: "Rate limiting implementado perfecto. Horas de la tarde-noche son mis mejores horas." },
    { user_id: juanId, energy: 2, focus: 2, stress: 1, type: "lento", hour: 10, date: daysAgo(2), notes: "Mañana lenta como siempre. El café está tardando en hacer efecto hoy." },
    { user_id: juanId, energy: 4, focus: 5, stress: 1, type: "productivo", hour: 16, date: daysAgo(2), notes: "Las consultas SQL optimizadas al máximo. Este es mi ritmo natural de tarde." },
    { user_id: juanId, energy: 4, focus: 4, stress: 1, type: "concentrado", hour: 21, date: daysAgo(2), notes: "Kubernetes es fascinante. Aprendo mejor de noche, sin interrupciones." },
    { user_id: juanId, energy: 2, focus: 2, stress: 2, type: "lento", hour: 10, date: daysAgo(1), notes: "Reunión importante a las 3pm me tiene pensativo desde la mañana. Café doble." },
    { user_id: juanId, energy: 5, focus: 5, stress: 2, type: "peak", hour: 15, date: daysAgo(1), notes: "La demo fue perfecta. Cliente muy satisfecho. Esto es lo que me motiva." },
    { user_id: juanId, energy: 4, focus: 4, stress: 1, type: "productivo", hour: 19, date: daysAgo(1), notes: "Documentación fluida después del éxito del día. Gran satisfacción." },
    { user_id: juanId, energy: 2, focus: 2, stress: 1, type: "lento", hour: 9, date: daysAgo(0), notes: "Mañana de siempre. Esperando mis horas de productividad real de la tarde." },
    { user_id: juanId, energy: 4, focus: 5, stress: 2, type: "concentrado", hour: 15, date: daysAgo(0), notes: "El deploy de hoy me tiene emocionado. Café listo, entorno preparado para el peak." },
  ]

  // ── 4. CARLOS ROJAS — Muy estresado, sobrecargado ────────────────────────────
  // Patrón: estrés alto constante, energía baja, muchas tareas sin completar

  const carlosTasks = [
    // Día 6
    { user_id: carlosId, title: "Informe mensual atrasado", description: "Reporte que debía estar listo el viernes", category: "trabajo", priority: "urgente", status: "en-progreso", duration: 180, completed: 0, hour: 9, date: daysAgo(6) },
    { user_id: carlosId, title: "Llamada con jefe sobre retrasos", description: "Explicar situación del proyecto", category: "trabajo", priority: "urgente", status: "completada", duration: 45, completed: 1, hour: 14, date: daysAgo(6) },
    { user_id: carlosId, title: "Médico por dolor de cabeza", description: "Consulta por migrañas frecuentes", category: "salud", priority: "alta", status: "cancelada", duration: 60, completed: 0, hour: 17, date: daysAgo(6) },
    // Día 5
    { user_id: carlosId, title: "Terminar presentación cliente A", description: "50 slides para mañana", category: "trabajo", priority: "urgente", status: "completada", duration: 240, completed: 1, hour: 8, date: daysAgo(5) },
    { user_id: carlosId, title: "Responder 30 emails pendientes", description: "Bandeja de entrada desbordada", category: "trabajo", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 16, date: daysAgo(5) },
    { user_id: carlosId, title: "Ejercicio (cancelado por trabajo)", description: "Rutina de cardio pendiente", category: "salud", priority: "media", status: "cancelada", duration: 45, completed: 0, hour: 20, date: daysAgo(5) },
    // Día 4
    { user_id: carlosId, title: "Presentación cliente A", description: "Demo del sistema de reportes", category: "trabajo", priority: "urgente", status: "completada", duration: 90, completed: 1, hour: 10, date: daysAgo(4) },
    { user_id: carlosId, title: "Planificar proyecto cliente B", description: "Nuevo proyecto que llega sin tiempo", category: "trabajo", priority: "urgente", status: "en-progreso", duration: 120, completed: 0, hour: 15, date: daysAgo(4) },
    { user_id: carlosId, title: "Dormir temprano", description: "Intentar recuperar horas de sueño", category: "salud", priority: "alta", status: "cancelada", duration: 480, completed: 0, hour: 22, date: daysAgo(4) },
    // Día 3
    { user_id: carlosId, title: "Reuniones back-to-back (3h)", description: "Tres reuniones sin pausas", category: "trabajo", priority: "alta", status: "completada", duration: 180, completed: 1, hour: 9, date: daysAgo(3) },
    { user_id: carlosId, title: "Análisis de datos cliente B", description: "Requiere concentración que no tengo", category: "trabajo", priority: "urgente", status: "pendiente", duration: 120, completed: 0, hour: 15, date: daysAgo(3) },
    { user_id: carlosId, title: "Llamar a un amigo", description: "Necesito desahogarme con alguien", category: "personal", priority: "media", status: "completada", duration: 30, completed: 1, hour: 21, date: daysAgo(3) },
    // Día 2
    { user_id: carlosId, title: "Propuesta cliente C (urgente)", description: "Otro cliente que necesita propuesta para hoy", category: "trabajo", priority: "urgente", status: "completada", duration: 150, completed: 1, hour: 8, date: daysAgo(2) },
    { user_id: carlosId, title: "Análisis pendiente cliente B", description: "Continuación del análisis de ayer", category: "trabajo", priority: "urgente", status: "en-progreso", duration: 120, completed: 0, hour: 14, date: daysAgo(2) },
    { user_id: carlosId, title: "Mindfulness / meditación", description: "App de meditación para bajar estrés", category: "salud", priority: "alta", status: "cancelada", duration: 20, completed: 0, hour: 22, date: daysAgo(2) },
    // Ayer
    { user_id: carlosId, title: "Crisis: fallo del sistema en producción", description: "Caída del sistema del cliente A", category: "trabajo", priority: "urgente", status: "completada", duration: 300, completed: 1, hour: 7, date: daysAgo(1) },
    { user_id: carlosId, title: "Postmortem del incidente", description: "Documento de análisis del fallo", category: "trabajo", priority: "alta", status: "en-progreso", duration: 90, completed: 0, hour: 17, date: daysAgo(1) },
    // Hoy
    { user_id: carlosId, title: "Terminar postmortem", description: "Entregar análisis a dirección", category: "trabajo", priority: "urgente", status: "pendiente", duration: 90, completed: 0, hour: 9, date: daysAgo(0) },
    { user_id: carlosId, title: "Reunión de emergencia dirección", description: "Consecuencias del incidente de ayer", category: "trabajo", priority: "urgente", status: "pendiente", duration: 60, completed: 0, hour: 11, date: daysAgo(0) },
    { user_id: carlosId, title: "Médico (2do intento)", description: "No puedo seguir posponiendo", category: "salud", priority: "alta", status: "pendiente", duration: 60, completed: 0, hour: 17, date: daysAgo(0) },
  ]

  const carlosMoods = [
    { user_id: carlosId, energy: 2, focus: 2, stress: 5, type: "agotado", hour: 9, date: daysAgo(6), notes: "Llevo 3 días sin dormir bien. Cansado de todo. El café ya no me ayuda a concentrarme." },
    { user_id: carlosId, energy: 2, focus: 2, stress: 5, type: "estresado", hour: 14, date: daysAgo(6), notes: "La llamada con mi jefe fue muy estresante. Siento que todo se acumula sin parar." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "agotado", hour: 22, date: daysAgo(6), notes: "Agotado física y mentalmente. No puedo más con esta carga de trabajo." },
    { user_id: carlosId, energy: 2, focus: 3, stress: 5, type: "estresado", hour: 8, date: daysAgo(5), notes: "Tenía que terminar la presentación sí o sí. Cuatro cafés y apenas puedo funcionar." },
    { user_id: carlosId, energy: 3, focus: 3, stress: 4, type: "tenso", hour: 14, date: daysAgo(5), notes: "Los 30 emails respondidos pero ya no recuerdo lo que escribí. Piloto automático." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "agotado", hour: 21, date: daysAgo(5), notes: "Cancelé el ejercicio de nuevo. No tengo energía. Necesito vacaciones urgente." },
    { user_id: carlosId, energy: 3, focus: 4, stress: 4, type: "nervioso", hour: 9, date: daysAgo(4), notes: "Nervioso por la presentación. Mucho café para estar alerta. Las manos me tiemblan un poco." },
    { user_id: carlosId, energy: 2, focus: 2, stress: 5, type: "estresado", hour: 15, date: daysAgo(4), notes: "Cliente B llega sin aviso con un proyecto urgente. ¿Cuándo voy a tener tiempo para todo?" },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "agotado", hour: 23, date: daysAgo(4), notes: "Son las 11pm y sigo trabajando. Ni siquiera pude dormir temprano como planeé." },
    { user_id: carlosId, energy: 2, focus: 2, stress: 5, type: "agotado", hour: 9, date: daysAgo(3), notes: "Tres reuniones consecutivas sin descanso. Cansado de no poder hacer trabajo real." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "sin energía", hour: 16, date: daysAgo(3), notes: "No pude concentrarme en el análisis. Distraído, frustrado, sin motivación ninguna." },
    { user_id: carlosId, energy: 2, focus: 2, stress: 3, type: "aliviado", hour: 21, date: daysAgo(3), notes: "Hablar con mi amigo ayudó un poco. Necesito desahogarme más seguido." },
    { user_id: carlosId, energy: 2, focus: 3, stress: 5, type: "estresado", hour: 8, date: daysAgo(2), notes: "Otro cliente urgente. Empiezo el día con estrés máximo. Café desde las 7am." },
    { user_id: carlosId, energy: 2, focus: 2, stress: 5, type: "agotado", hour: 15, date: daysAgo(2), notes: "No logro avanzar con el análisis de cliente B. Distraído, la cabeza no me funciona." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "cansado", hour: 22, date: daysAgo(2), notes: "Ni la meditación pude hacer. Demasiado cansado para todo. ¿Esto es sostenible?" },
    { user_id: carlosId, energy: 1, focus: 2, stress: 5, type: "crisis", hour: 7, date: daysAgo(1), notes: "Desperté con alarma de crisis. Sistema caído. Estrés extremo desde el primer segundo del día." },
    { user_id: carlosId, energy: 2, focus: 3, stress: 5, type: "agotado", hour: 18, date: daysAgo(1), notes: "Crisis resuelta pero agotado. 11 horas de trabajo continuo. No puedo más." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "estresado", hour: 9, date: daysAgo(0), notes: "Reunión de emergencia con dirección hoy. No dormí bien. Mucho estrés, mucho café, poco foco." },
    { user_id: carlosId, energy: 1, focus: 1, stress: 5, type: "agotado", hour: 13, date: daysAgo(0), notes: "La reunión fue dura. Me siento completamente sin energía y sin motivación para seguir." },
  ]

  // ── 5. LAURA MENDOZA — Procrastinadora, bajo foco ────────────────────────────
  // Patrón: energía moderada pero foco muy bajo, muchas distracciones

  const lauraTasks = [
    // Día 6
    { user_id: lauraId, title: "Estudiar para examen de estadística", description: "Examen el viernes, hay que estudiar ya", category: "estudio", priority: "urgente", status: "pendiente", duration: 120, completed: 0, hour: 10, date: daysAgo(6) },
    { user_id: lauraId, title: "Organizar escritorio", description: "Preparar ambiente de estudio", category: "personal", priority: "baja", status: "completada", duration: 60, completed: 1, hour: 15, date: daysAgo(6) },
    { user_id: lauraId, title: "Ver videos de YouTube (en vez de estudiar)", description: "Procrastinación confirmada", category: "ocio", priority: "baja", status: "completada", duration: 120, completed: 1, hour: 20, date: daysAgo(6) },
    // Día 5
    { user_id: lauraId, title: "Estudiar estadística (2do intento)", description: "Hoy sí me concentro", category: "estudio", priority: "urgente", status: "en-progreso", duration: 120, completed: 0, hour: 11, date: daysAgo(5) },
    { user_id: lauraId, title: "Hacer ejercicio", description: "Rutina de yoga en casa", category: "salud", priority: "media", status: "completada", duration: 30, completed: 1, hour: 9, date: daysAgo(5) },
    { user_id: lauraId, title: "Entrega trabajo de inglés", description: "Essay de 500 palabras", category: "estudio", priority: "alta", status: "completada", duration: 90, completed: 1, hour: 22, date: daysAgo(5) },
    // Día 4
    { user_id: lauraId, title: "Estadística - temas pendientes", description: "Variables aleatorias y distribuciones", category: "estudio", priority: "urgente", status: "pendiente", duration: 150, completed: 0, hour: 10, date: daysAgo(4) },
    { user_id: lauraId, title: "Salida con amigas", description: "Café y compras", category: "ocio", priority: "alta", status: "completada", duration: 240, completed: 1, hour: 14, date: daysAgo(4) },
    { user_id: lauraId, title: "Estudiar de noche (tarde)", description: "Sesión de estudio de emergencia a las 11pm", category: "estudio", priority: "urgente", status: "en-progreso", duration: 60, completed: 0, hour: 23, date: daysAgo(4) },
    // Día 3
    { user_id: lauraId, title: "Resolver ejercicios de probabilidad", description: "50 ejercicios del libro", category: "estudio", priority: "urgente", status: "completada", duration: 180, completed: 1, hour: 14, date: daysAgo(3) },
    { user_id: lauraId, title: "Preparar presentación de economía", description: "Presentación grupal del jueves", category: "estudio", priority: "alta", status: "pendiente", duration: 120, completed: 0, hour: 19, date: daysAgo(3) },
    // Día 2
    { user_id: lauraId, title: "Presentación de economía (grupal)", description: "Coordinación con el grupo", category: "estudio", priority: "alta", status: "completada", duration: 60, completed: 1, hour: 10, date: daysAgo(2) },
    { user_id: lauraId, title: "Repasar fórmulas estadística", description: "Ya casi es el examen", category: "estudio", priority: "urgente", status: "en-progreso", duration: 90, completed: 0, hour: 16, date: daysAgo(2) },
    { user_id: lauraId, title: "Scroll en Instagram (2h)", description: "La procrastinación no para", category: "ocio", priority: "baja", status: "completada", duration: 120, completed: 1, hour: 21, date: daysAgo(2) },
    // Ayer
    { user_id: lauraId, title: "Examen de estadística", description: "El momento de la verdad", category: "estudio", priority: "urgente", status: "completada", duration: 120, completed: 1, hour: 10, date: daysAgo(1) },
    { user_id: lauraId, title: "Descanso post-examen", description: "Merecido descanso", category: "ocio", priority: "media", status: "completada", duration: 180, completed: 1, hour: 14, date: daysAgo(1) },
    // Hoy
    { user_id: lauraId, title: "Empezar proyecto de cálculo", description: "Entrega en 2 semanas, mejor empezar ya", category: "estudio", priority: "alta", status: "pendiente", duration: 120, completed: 0, hour: 10, date: daysAgo(0) },
    { user_id: lauraId, title: "Llamar a mamá", description: "No la llamo hace una semana", category: "personal", priority: "media", status: "pendiente", duration: 30, completed: 0, hour: 18, date: daysAgo(0) },
    { user_id: lauraId, title: "Planificar semana siguiente", description: "Para no dejar todo para el último momento (de nuevo)", category: "personal", priority: "alta", status: "pendiente", duration: 30, completed: 0, hour: 20, date: daysAgo(0) },
  ]

  const lauraMoods = [
    { user_id: lauraId, energy: 3, focus: 1, stress: 2, type: "distraída", hour: 10, date: daysAgo(6), notes: "Hoy tenía que estudiar estadística pero terminé organizando el escritorio. Distraída con cualquier cosa." },
    { user_id: lauraId, energy: 3, focus: 1, stress: 2, type: "procrastinando", hour: 16, date: daysAgo(6), notes: "Sigo sin estudiar. Los videos de YouTube me atraparon. Mañana empiezo en serio, lo prometo." },
    { user_id: lauraId, energy: 3, focus: 2, stress: 3, type: "culpable", hour: 22, date: daysAgo(6), notes: "Ansiedad por no haber estudiado. Mañana definitivamente empiezo." },
    { user_id: lauraId, energy: 3, focus: 2, stress: 2, type: "distraída", hour: 11, date: daysAgo(5), notes: "Intenté estudiar pero el teléfono no para. Notificaciones, redes sociales, distracted con todo." },
    { user_id: lauraId, energy: 3, focus: 3, stress: 2, type: "motivada", hour: 17, date: daysAgo(5), notes: "El essay de inglés me salió bien. Cuando tengo deadline claro sí me concentro." },
    { user_id: lauraId, energy: 2, focus: 1, stress: 4, type: "ansiosa", hour: 23, date: daysAgo(5), notes: "Entregué el essay justo a tiempo. Demasiado estrés de último momento. Necesito organizarme mejor." },
    { user_id: lauraId, energy: 3, focus: 1, stress: 2, type: "distraída", hour: 11, date: daysAgo(4), notes: "Hoy era el día de estudiar estadística en serio. Pero llegaron mis amigas y... preferí salir." },
    { user_id: lauraId, energy: 4, focus: 3, stress: 1, type: "animada", hour: 15, date: daysAgo(4), notes: "Pasé genial con mis amigas. Café y compras. A veces necesito desconectar aunque sea mal momento." },
    { user_id: lauraId, energy: 2, focus: 1, stress: 4, type: "ansiosa", hour: 23, date: daysAgo(4), notes: "Son las 11pm y recién empiezo a estudiar. Agotada y ansiosa. No puedo concentrarme así de noche." },
    { user_id: lauraId, energy: 3, focus: 3, stress: 3, type: "concentrada", hour: 15, date: daysAgo(3), notes: "Finalmente logré concentrarme en los ejercicios. Cuando me pongo, me pongo. El café ayudó mucho." },
    { user_id: lauraId, energy: 2, focus: 1, stress: 3, type: "cansada", hour: 20, date: daysAgo(3), notes: "Agotada después de los ejercicios. La presentación puede esperar para mañana (otra vez)." },
    { user_id: lauraId, energy: 3, focus: 2, stress: 3, type: "distraída", hour: 10, date: daysAgo(2), notes: "La presentación grupal estuvo bien. Pero después seguí procrastinando con Instagram. No aprendo." },
    { user_id: lauraId, energy: 3, focus: 2, stress: 4, type: "ansiosa", hour: 17, date: daysAgo(2), notes: "El examen es mañana y no tengo todo estudiado. Demasiada ansiedad para concentrarme bien." },
    { user_id: lauraId, energy: 2, focus: 1, stress: 4, type: "cansada", hour: 22, date: daysAgo(2), notes: "Terminé viendo Instagram 2 horas en vez de repasar. Sé que es malo pero no pude parar." },
    { user_id: lauraId, energy: 3, focus: 4, stress: 4, type: "nerviosa", hour: 9, date: daysAgo(1), notes: "Nerviosa por el examen. Sorprendentemente me concentré bien. La adrenalina del examen funcionó." },
    { user_id: lauraId, energy: 4, focus: 3, stress: 1, type: "aliviada", hour: 14, date: daysAgo(1), notes: "El examen terminó. Creo que me fue bien. Alivio total. Merecido descanso." },
    { user_id: lauraId, energy: 3, focus: 1, stress: 2, type: "relajada", hour: 10, date: daysAgo(0), notes: "Descanso post-examen. Sé que debería empezar el proyecto de cálculo pero me cuesta arrancar." },
    { user_id: lauraId, energy: 3, focus: 2, stress: 2, type: "procrastinando", hour: 15, date: daysAgo(0), notes: "Llevo 3 horas sin hacer nada productivo. Distraída con el teléfono. El cálculo puede esperar un día más, ¿no?" },
  ]

  // ── 6. Insertar todos los datos ───────────────────────────────────────────────

  const allTasks = [...mariaTasks, ...juanTasks, ...carlosTasks, ...lauraTasks]
  const allMoods = [...mariaMoods, ...juanMoods, ...carlosMoods, ...lauraMoods]

  for (const t of allTasks) {
    await insertTask(t)
  }

  for (const m of allMoods) {
    await insertMood(m)
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DB] Seed completo: ${allTasks.length} tareas, ${allMoods.length} moods para 4 perfiles`)
  }
}

export default getDb
