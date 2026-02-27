import { getDb } from './db'
import { verifyToken } from './auth'
import { 
  encryptTaskData, 
  decryptTaskData, 
  encryptMoodNotes, 
  decryptMoodNotes,
  encryptInsightData,
  decryptInsightData
} from './encryption'
import { canAccessUserData, logDataAccess } from './roles'

// Función para verificar autenticación y permisos
async function verifyUserAccess(userId: number, targetUserId: number, action: string, dataType: string, request?: Request): Promise<boolean> {
  // Verificar que el usuario puede acceder a los datos del targetUserId
  const hasAccess = await canAccessUserData(userId, targetUserId)
  
  if (!hasAccess) {
    return false
  }

  // Registrar acceso en logs de auditoría
  const clientIP = request?.headers.get('x-forwarded-for') || 
                  request?.headers.get('x-real-ip') || 
                  'unknown'
  const userAgent = request?.headers.get('user-agent') || 'unknown'

  await logDataAccess(userId, action, dataType, targetUserId, clientIP, userAgent)
  
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
  
  // Descifrar datos sensibles
  return result.rows.map(row => {
    const decryptedData = decryptTaskData({
      title: row.title as string,
      description: row.description as string,
      tags: row.tags as string,
    })
    
    return {
      ...row,
      title: decryptedData.title,
      description: decryptedData.description,
      tags: decryptedData.tags,
    }
  })
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
  
  // Cifrar datos sensibles
  const encryptedData = encryptTaskData({
    title: taskData.title,
    description: taskData.description || null,
    tags: taskData.tags || null,
  })
  
  await db.execute({
    sql: `INSERT INTO tasks 
      (user_id, title, description, category, priority, status, duration, completed, hour, date, due_date, tags) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      userId,
      encryptedData.title,
      encryptedData.description,
      taskData.category,
      taskData.priority,
      taskData.status,
      taskData.duration,
      taskData.completed,
      taskData.hour,
      taskData.date,
      taskData.due_date || null,
      encryptedData.tags,
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
  
  // Construir query dinámicamente
  const updates: string[] = []
  const args: any[] = []
  
  if (taskData.title !== undefined) { 
    const encryptedTitle = encryptTaskData({ title: taskData.title, description: null, tags: null })
    updates.push("title = ?")
    args.push(encryptedTitle.title)
  }
  if (taskData.description !== undefined) { 
    const encryptedDesc = encryptTaskData({ title: '', description: taskData.description, tags: null })
    updates.push("description = ?")
    args.push(encryptedDesc.description)
  }
  if (taskData.category !== undefined) { updates.push("category = ?"); args.push(taskData.category) }
  if (taskData.priority !== undefined) { updates.push("priority = ?"); args.push(taskData.priority) }
  if (taskData.status !== undefined) {
    updates.push("status = ?")
    args.push(taskData.status)
    // Actualizar completed basado en status
    const isCompleted = taskData.status === 'completada' ? 1 : 0
    updates.push("completed = ?")
    args.push(isCompleted)
    
    // Si cambia a en-progreso, registrar started_at
    if (taskData.status === 'en-progreso') {
      updates.push("started_at = CURRENT_TIMESTAMP")
    }
    
    // Si se completa, registrar completed_at
    if (taskData.status === 'completada') {
      updates.push("completed_at = CURRENT_TIMESTAMP")
    }
  } else if (taskData.completed !== undefined) {
    updates.push("completed = ?")
    args.push(taskData.completed ? 1 : 0)
  }
  if (taskData.duration !== undefined) { updates.push("duration = ?"); args.push(taskData.duration) }
  if (taskData.hour !== undefined) { updates.push("hour = ?"); args.push(Math.max(0, Math.min(23, Number(taskData.hour)))) }
  if (taskData.date !== undefined) { updates.push("date = ?"); args.push(taskData.date) }
  if (taskData.due_date !== undefined) { updates.push("due_date = ?"); args.push(taskData.due_date) }
  if (taskData.tags !== undefined) {
    const encryptedTags = encryptTaskData({ title: '', description: null, tags: taskData.tags })
    updates.push("tags = ?")
    args.push(encryptedTags.tags)
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

  // Descifrar datos para devolver
  const row = result.rows[0]
  const decryptedData = decryptTaskData({
    title: row.title as string,
    description: row.description as string,
    tags: row.tags as string,
  })
  
  return {
    ...row,
    title: decryptedData.title,
    description: decryptedData.description,
    tags: decryptedData.tags,
  }
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
  
  // Descifrar notas sensibles
  return result.rows.map(row => ({
    ...row,
    notes: row.notes ? decryptMoodNotes(row.notes) : null,
  }))
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
  
  // Cifrar notas sensibles
  const encryptedNotes = moodData.notes ? encryptMoodNotes(moodData.notes) : null
  
  await db.execute({
    sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      userId,
      moodData.energy,
      moodData.focus,
      moodData.stress,
      moodData.type,
      moodData.hour,
      moodData.date,
      encryptedNotes,
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
      insightData.analysis_type,
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
  
  // Descifrar campos sensibles antes de enviar a Gemini
  return result.rows.map(row => {
    const decrypted = decryptTaskData({
      title: row.title as string,
      description: row.description as string | null,
      tags: row.tags as string | null,
    })
    return {
      id: row.id,
      title: decrypted.title,
      description: decrypted.description,
      category: row.category as string,
      priority: row.priority as string,
      status: row.status as string,
      duration: row.duration as number,
      completed: row.completed as number,
      hour: row.hour as number,
      date: row.date as string,
      tags: decrypted.tags,
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
  
  // Descifrar notes antes de enviar a Gemini
  return result.rows.map(row => ({
    id: row.id,
    type: row.type as string,
    hour: row.hour as number,
    energy: row.energy as number,
    focus: row.focus as number,
    stress: row.stress as number,
    date: row.date as string,
    notes: decryptMoodNotes(row.notes as string | null),
  }))
}