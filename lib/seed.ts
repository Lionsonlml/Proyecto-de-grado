/**
 * lib/seed.ts — Script de semilla standalone
 *
 * Crea dos perfiles de prueba representativos para demostración de la tesis:
 *   • quemado@test.com   → Perfil "Quemado" (burnout, sobrecarga)
 *   • productivo@test.com → Perfil "Productivo" (pico de rendimiento)
 *
 * Uso: pnpm seed
 * Requiere: TURSO_DATABASE_URL y TURSO_AUTH_TOKEN en .env.local
 */

import { createClient } from "@libsql/client"
import { hash } from "bcryptjs"
import { encryptSensitiveData, encryptMoodNotes } from "./encryption"

// ── Cargar .env.local manualmente en scripts Node ─────────────────────────────
import { readFileSync } from "fs"
import { resolve } from "path"

try {
  const envPath = resolve(process.cwd(), ".env.local")
  const lines = readFileSync(envPath, "utf-8").split("\n")
  for (const line of lines) {
    const [key, ...rest] = line.split("=")
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim()
  }
} catch {
  console.warn("[seed] No se pudo leer .env.local — asegúrate de tener las vars de entorno")
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// ── Utilidades ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().split("T")[0]
}

async function getOrCreateUser(email: string, name: string, password: string): Promise<number> {
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ?",
    args: [email],
  })
  if (existing.rows.length > 0) {
    console.log(`  ↩ Usuario ya existe: ${email} (id=${existing.rows[0].id})`)
    return existing.rows[0].id as number
  }
  const hashed = await hash(password, 10)
  const result = await db.execute({
    sql: "INSERT INTO users (email, password, name) VALUES (?, ?, ?) RETURNING id",
    args: [email, hashed, name],
  })
  return result.rows[0].id as number
}

// ── Perfil "Quemado" ───────────────────────────────────────────────────────────
// 7 días de estrés alto, energía baja, 15 tareas con 70% canceladas/pendientes

async function seedQuemado() {
  console.log("\n[seed] Creando perfil Quemado...")
  const userId = await getOrCreateUser("quemado@test.com", "Sofía Quemada", "password123")

  // Moods: 7 días — estrés 4-5, energía 1-2, foco 1-2
  const moodNotes = [
    "agotado total, no puedo más",
    "sin energía, todo me pesa",
    "demasiado trabajo acumulado",
    "no dormí bien, muy estresado",
    "siento que no avanzo nada",
    "sobrecargado con reuniones",
    "primer momento de calma en días",
  ]

  for (let i = 0; i < 7; i++) {
    const date = daysAgo(i)
    const energy = i === 6 ? 2 : 1
    const focus = i === 6 ? 2 : 1
    const stress = i === 6 ? 4 : 5
    const notes = encryptMoodNotes(moodNotes[i])
    await db.execute({
      sql: `INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, energy, focus, stress, "muy-mal", 9, date, notes],
    })
  }
  console.log("  ✓ 7 moods insertados (estrés alto)")

  // Tareas: 15 — 70% canceladas/pendientes, duración 120-180min (sobrecarga)
  const tasksData = [
    { title: "Informe trimestral completo", status: "pending",   duration: 180 },
    { title: "Revisión de código del módulo",    status: "cancelled", duration: 150 },
    { title: "Presentación para dirección",  status: "pending",   duration: 120 },
    { title: "Reunión con equipo de diseño",   status: "cancelled", duration: 60  },
    { title: "Documentar API REST",          status: "pending",   duration: 180 },
    { title: "Corregir bugs en producción",  status: "cancelled", duration: 120 },
    { title: "Actualizar dependencias",       status: "pending",   duration: 90  },
    { title: "Planificar sprint siguiente",  status: "cancelled", duration: 60  },
    { title: "Escribir tests de integración",status: "pending",   duration: 150 },
    { title: "Optimizar consultas DB",       status: "cancelled", duration: 180 },
    { title: "Revisión de PRs pendientes",   status: "pending",   duration: 120 },
    { title: "Configurar CI/CD pipeline",    status: "completed", duration: 90  },
    { title: "Responder tickets de soporte", status: "completed", duration: 45  },
    { title: "Backup de datos semanales",    status: "completed", duration: 30  },
    { title: "Standup diario",               status: "completed", duration: 15  },
  ]

  for (const t of tasksData) {
    const encTitle = encryptSensitiveData(t.title)
    const date = daysAgo(Math.floor(Math.random() * 7))
    await db.execute({
      sql: `INSERT INTO tasks (user_id, title, category, priority, status, duration, date, hour)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, encTitle, "trabajo", "high", t.status, t.duration, date, 10],
    })
  }
  console.log("  ✓ 15 tareas insertadas (70% canceladas/pendientes)")
}

// ── Perfil "Productivo" ────────────────────────────────────────────────────────
// 7 días de energía alta, estrés bajo, 15 tareas con 90% completadas

async function seedProductivo() {
  console.log("\n[seed] Creando perfil Productivo...")
  const userId = await getOrCreateUser("productivo@test.com", "Diego Productivo", "password123")

  // Moods: 7 días — energía 4-5, foco 4-5, estrés 1-2
  const moodNotes = [
    "día excelente, logré mucho",
    "concentrado toda la mañana",
    "flujo de trabajo ideal",
    "energía alta desde temprano",
    "terminé todo antes de las 3pm",
    "bloques de tiempo perfectos",
    "muy bien, orgulloso del avance",
  ]

  for (let i = 0; i < 7; i++) {
    const date = daysAgo(i)
    const energy = i % 2 === 0 ? 5 : 4
    const focus = i % 3 === 0 ? 5 : 4
    const stress = i % 4 === 0 ? 2 : 1
    const notes = encryptMoodNotes(moodNotes[i])
    // Pico en horas 8-11
    const hour = 8 + (i % 4)
    await db.execute({
      sql: `INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, energy, focus, stress, "excelente", hour, date, notes],
    })
  }
  console.log("  ✓ 7 moods insertados (energía alta, pico 8-11h)")

  // Tareas: 15 — 90% completadas, duración 30-90min, horario pico AM
  const categories = ["trabajo", "personal", "estudio", "salud", "proyecto"]
  const tasksData = [
    { title: "Revisar emails y priorizar",    status: "completed", duration: 30,  hour: 8  },
    { title: "Completar módulo de autenticación", status: "completed", duration: 90, hour: 9 },
    { title: "Escribir tests unitarios",      status: "completed", duration: 60,  hour: 10 },
    { title: "Revisión de código PR #42",     status: "completed", duration: 45,  hour: 11 },
    { title: "Documentar nueva funcionalidad",status: "completed", duration: 30,  hour: 9  },
    { title: "Optimizar componente dashboard",status: "completed", duration: 60,  hour: 8  },
    { title: "Integración API externa",       status: "completed", duration: 90,  hour: 10 },
    { title: "Sesión de ejercicio",           status: "completed", duration: 45,  hour: 7  },
    { title: "Leer artículo técnico",         status: "completed", duration: 30,  hour: 8  },
    { title: "Planificación semanal",         status: "completed", duration: 30,  hour: 9  },
    { title: "Deploy a staging",              status: "completed", duration: 45,  hour: 11 },
    { title: "Refactorizar helper de caché",  status: "completed", duration: 60,  hour: 10 },
    { title: "Preparar demo para cliente",    status: "pending",   duration: 90,  hour: 14 },
    { title: "Actualizar roadmap del proyecto",status: "pending",  duration: 60,  hour: 15 },
    { title: "Investigar nueva librería",     status: "pending",   duration: 30,  hour: 16 },
  ]

  for (let i = 0; i < tasksData.length; i++) {
    const t = tasksData[i]
    const encTitle = encryptSensitiveData(t.title)
    const date = daysAgo(Math.floor(i / 3))
    const category = categories[i % categories.length]
    await db.execute({
      sql: `INSERT INTO tasks (user_id, title, category, priority, status, duration, date, hour)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [userId, encTitle, category, "medium", t.status, t.duration, date, t.hour],
    })
  }
  console.log("  ✓ 15 tareas insertadas (90% completadas)")
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

export async function seedTestProfiles() {
  console.log("[seed] Iniciando semilla de perfiles de prueba...")
  await seedQuemado()
  await seedProductivo()
  console.log("\n[seed] Completado. Perfiles disponibles:")
  console.log("  • quemado@test.com    / password123")
  console.log("  • productivo@test.com / password123")
  await db.close()
}

// Ejecutar si es el script principal
seedTestProfiles().catch((err) => {
  console.error("[seed] Error:", err)
  process.exit(1)
})
