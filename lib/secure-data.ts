import { getDb } from './db'
import { verifyToken } from './auth'
import {
  encryptTaskData,
  decryptTaskData,
  encryptMoodNotes,
  decryptMoodNotes,
  encryptInsightData,
  decryptInsightData,
  encryptTaskFullData,
  decryptTaskFullData,
  encryptMoodFullData,
  decryptMoodFullData,
  encryptField,
  decryptField,
} from './encryption'
import { canAccessUserData, logDataAccess } from './roles'

// Función para verificar autenticación y permisos
async function verifyUserAccess(userId: number, targetUserId: number, action: string, dataType: string, request?: Request): Promise<boolean> {
  // Verificar que el usuario puede acceder a los datos del targetUserId
  const hasAccess = await canAccessUserData(userId, targetUserId)
  
  if (!hasAccess) {
    return false
  }

  // Registrar acceso en logs de auditoría (fire-and-forget: un fallo de auditoría
  // nunca debe bloquear el acceso a datos del usuario)
  const clientIP = request?.headers.get('x-forwarded-for') ||
                  request?.headers.get('x-real-ip') ||
                  'unknown'
  const userAgent = request?.headers.get('user-agent') || 'unknown'

  logDataAccess(userId, action, dataType, targetUserId, clientIP, userAgent).catch(err => {
    console.error('[audit] logDataAccess error:', err)
  })

  return true
}

// Obtener tareas de usuario con cifrado/descifrado automático
export async function getSecureUserTasks(userId: number, targetUserId: number, date?: string, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, targetUserId, 'read', 'tasks', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para acceder a estos datos')
  }

  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [targetUserId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [targetUserId],
    })
  }
  
  // Descifrar todos los campos sensibles
  return result.rows.map(row => decryptTaskFullData(row as Record<string, any>))
}

// Guardar tarea con cifrado automático
export async function saveSecureTask(userId: number, taskData: {
  title: string
  description?: string
  category: string
  priority: string
  status: string
  duration: number
  completed: number
  hour: number
  date: string
  due_date?: string
  tags?: string
}, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, userId, 'create', 'tasks', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para crear tareas')
  }

  const db = getDb()

  // Cifrar todos los campos sensibles
  const enc = encryptTaskFullData({
    title: taskData.title,
    description: taskData.description || null,
    tags: taskData.tags || null,
    category: taskData.category,
    priority: taskData.priority,
    status: taskData.status,
    duration: taskData.duration,
    completed: taskData.completed,
    hour: taskData.hour,
    date: taskData.date,
    due_date: taskData.due_date || null,
  })

  await db.execute({
    sql: `INSERT INTO tasks
      (user_id, title, description, category, priority, status, duration, completed, hour, date, due_date, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      enc.title,
      enc.description,
      enc.category,
      enc.priority,
      enc.status,
      enc.duration,
      enc.completed,
      enc.hour,
      enc.date,
      enc.due_date,
      enc.tags,
    ],
  })
}

// Actualizar tarea con cifrado automático
export async function updateSecureTask(userId: number, taskId: number, taskData: {
  title?: string
  description?: string
  category?: string
  priority?: string
  status?: string
  duration?: number
  completed?: number
  hour?: number
  date?: string
  due_date?: string
  tags?: string
}, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, userId, 'update', 'tasks', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para actualizar tareas')
  }

  const db = getDb()

  // Construir query dinámicamente cifrando todos los campos sensibles
  const updates: string[] = []
  const args: any[] = []

  if (taskData.title !== undefined) {
    updates.push("title = ?")
    args.push(encryptField(taskData.title))
  }
  if (taskData.description !== undefined) {
    updates.push("description = ?")
    args.push(encryptField(taskData.description))
  }
  if (taskData.category !== undefined) {
    updates.push("category = ?")
    args.push(encryptField(taskData.category))
  }
  if (taskData.priority !== undefined) {
    updates.push("priority = ?")
    args.push(encryptField(taskData.priority))
  }
  if (taskData.status !== undefined) {
    updates.push("status = ?")
    args.push(encryptField(taskData.status))
    // Actualizar completed basado en status
    const isCompleted = taskData.status === 'completada' ? 1 : 0
    updates.push("completed = ?")
    args.push(encryptField(isCompleted))

    // Si cambia a en-progreso, registrar started_at cifrado
    if (taskData.status === 'en-progreso') {
      updates.push("started_at = ?")
      args.push(encryptField(new Date().toISOString()))
    }

    // Si se completa, registrar completed_at cifrado
    if (taskData.status === 'completada') {
      updates.push("completed_at = ?")
      args.push(encryptField(new Date().toISOString()))
    }
  } else if (taskData.completed !== undefined) {
    updates.push("completed = ?")
    args.push(encryptField(taskData.completed ? 1 : 0))
  }
  if (taskData.duration !== undefined) {
    updates.push("duration = ?")
    args.push(encryptField(taskData.duration))
  }
  if (taskData.hour !== undefined) {
    updates.push("hour = ?")
    args.push(encryptField(Math.max(0, Math.min(23, Number(taskData.hour)))))
  }
  if (taskData.date !== undefined) {
    updates.push("date = ?")
    args.push(encryptField(taskData.date))
  }
  if (taskData.due_date !== undefined) {
    updates.push("due_date = ?")
    args.push(encryptField(taskData.due_date))
  }
  if (taskData.tags !== undefined) {
    updates.push("tags = ?")
    args.push(encryptField(taskData.tags))
  }

  updates.push("updated_at = CURRENT_TIMESTAMP")

  args.push(taskId, userId)

  await db.execute({
    sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
    args,
  })

  // Obtener la tarea actualizada
  const result = await db.execute({
    sql: "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
    args: [taskId, userId],
  })

  if (result.rows.length === 0) {
    throw new Error('Tarea no encontrada')
  }

  return decryptTaskFullData(result.rows[0] as Record<string, any>)
}

// Eliminar tarea con logging de auditoría
export async function deleteSecureTask(userId: number, taskId: number, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, userId, 'delete', 'tasks', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para eliminar tareas')
  }

  const db = getDb()
  
  // Verificar que la tarea existe y pertenece al usuario
  const existingTask = await db.execute({
    sql: "SELECT id FROM tasks WHERE id = ? AND user_id = ?",
    args: [taskId, userId],
  })

  if (existingTask.rows.length === 0) {
    throw new Error('Tarea no encontrada')
  }

  await db.execute({
    sql: "DELETE FROM tasks WHERE id = ? AND user_id = ?",
    args: [taskId, userId],
  })
}

// Obtener moods de usuario con cifrado/descifrado automático
export async function getSecureUserMoods(userId: number, targetUserId: number, date?: string, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, targetUserId, 'read', 'moods', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para acceder a estos datos')
  }

  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT * FROM moods WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [targetUserId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [targetUserId],
    })
  }
  
  // Descifrar todos los campos sensibles
  return result.rows.map(row => decryptMoodFullData(row as Record<string, any>))
}

// Guardar mood con cifrado automático
export async function saveSecureMood(userId: number, moodData: {
  energy: number
  focus: number
  stress: number
  type: string
  hour: number
  date: string
  notes?: string
}, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, userId, 'create', 'moods', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para crear moods')
  }

  const db = getDb()

  // Cifrar todos los campos sensibles
  const enc = encryptMoodFullData({
    energy: moodData.energy,
    focus: moodData.focus,
    stress: moodData.stress,
    type: moodData.type,
    hour: moodData.hour,
    date: moodData.date,
    notes: moodData.notes || null,
  })

  await db.execute({
    sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      userId,
      enc.energy,
      enc.focus,
      enc.stress,
      enc.type,
      enc.hour,
      enc.date,
      enc.notes,
    ],
  })
}

// Obtener insights de IA con cifrado/descifrado automático
export async function getSecureUserInsights(userId: number, targetUserId: number, limit = 20, request?: Request, analysisType?: string) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, targetUserId, 'read', 'ai_insights', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para acceder a estos datos')
  }

  const db = getDb()
  const result = analysisType
    ? await db.execute({
        sql: "SELECT * FROM ai_insights WHERE user_id = ? AND analysis_type = ? ORDER BY created_at DESC LIMIT ?",
        args: [targetUserId, analysisType, limit],
      })
    : await db.execute({
        sql: "SELECT * FROM ai_insights WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
        args: [targetUserId, limit],
      })
  
  // Descifrar datos sensibles
  return result.rows.map(row => {
    const decryptedData = decryptInsightData({
      prompt: row.prompt as string,
      response: row.response as string,
      metadata: row.metadata as string,
    })

    return {
      ...row,
      prompt: decryptedData.prompt,
      response: decryptedData.response,
      metadata: decryptedData.metadata,
      analysis_type: decryptField(row.analysis_type as string) ?? (row.analysis_type as string) ?? '',
    }
  })
}

// Guardar insight de IA con cifrado automático
export async function saveSecureInsight(userId: number, insightData: {
  prompt: string
  response: string
  analysis_type: string
  metadata?: string
}, request?: Request) {
  // Verificar permisos de acceso
  const hasAccess = await verifyUserAccess(userId, userId, 'create', 'ai_insights', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para crear insights')
  }

  const db = getDb()
  
  // Cifrar datos sensibles
  const encryptedData = encryptInsightData({
    prompt: insightData.prompt,
    response: insightData.response,
    metadata: insightData.metadata || null,
  })

  await db.execute({
    sql: "INSERT INTO ai_insights (user_id, prompt, response, analysis_type, metadata) VALUES (?, ?, ?, ?, ?)",
    args: [
      userId,
      encryptedData.prompt,
      encryptedData.response,
      encryptField(insightData.analysis_type),
      encryptedData.metadata,
    ],
  })
}

// Función para verificar si un usuario puede acceder a datos específicos
export async function canUserAccessData(requestingUserId: number, targetUserId: number, dataType: string): Promise<boolean> {
  return await canAccessUserData(requestingUserId, targetUserId)
}

// Función para obtener datos de usuario con verificación de permisos
export async function getSecureUserData(userId: number, targetUserId: number, dataType: 'tasks' | 'moods' | 'insights', request?: Request) {
  switch (dataType) {
    case 'tasks':
      return await getSecureUserTasks(userId, targetUserId, undefined, request)
    case 'moods':
      return await getSecureUserMoods(userId, targetUserId, undefined, request)
    case 'insights':
      return await getSecureUserInsights(userId, targetUserId, 20, request)
    default:
      throw new Error('Tipo de datos no válido')
  }
}
// ✅ NUEVAS FUNCIONES SIN ENCRIPTACIÓN PARA GEMINI
// Obtener tareas SIN descifrar para enviar a Gemini
export async function getGeminiUserTasks(userId: number, targetUserId: number, date?: string, request?: Request) {
  const hasAccess = await verifyUserAccess(userId, targetUserId, 'read', 'tasks_gemini', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para acceder a estos datos')
  }

  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT id, title, description, category, priority, status, duration, completed, hour, date, tags FROM tasks WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [targetUserId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT id, title, description, category, priority, status, duration, completed, hour, date, tags FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [targetUserId],
    })
  }
  
  // Descifrar todos los campos sensibles antes de enviar a Gemini
  return result.rows.map(row => {
    const dec = decryptTaskFullData(row as Record<string, any>)
    return {
      id: dec.id,
      title: dec.title,
      description: dec.description,
      category: dec.category,
      priority: dec.priority,
      status: dec.status,
      duration: dec.duration,
      completed: dec.completed,
      hour: dec.hour,
      date: dec.date,
      tags: dec.tags,
    }
  })
}

// Obtener moods SIN desencriptar para enviar a Gemini
export async function getGeminiUserMoods(userId: number, targetUserId: number, date?: string, request?: Request) {
  const hasAccess = await verifyUserAccess(userId, targetUserId, 'read', 'moods_gemini', request)
  if (!hasAccess) {
    throw new Error('No tienes permisos para acceder a estos datos')
  }

  const db = getDb()
  let result
  
  if (date) {
    result = await db.execute({
      sql: "SELECT id, type, hour, energy, focus, stress, date, notes FROM moods WHERE user_id = ? AND date = ? ORDER BY hour ASC",
      args: [targetUserId, date],
    })
  } else {
    result = await db.execute({
      sql: "SELECT id, type, hour, energy, focus, stress, date, notes FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [targetUserId],
    })
  }
  
  // Descifrar todos los campos sensibles antes de enviar a Gemini
  return result.rows.map(row => {
    const dec = decryptMoodFullData(row as Record<string, any>)
    return {
      id: dec.id,
      type: dec.type,
      hour: dec.hour,
      energy: dec.energy,
      focus: dec.focus,
      stress: dec.stress,
      date: dec.date,
      notes: dec.notes,
    }
  })
}