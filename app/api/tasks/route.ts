import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getSecureUserTasks, saveSecureTask, updateSecureTask, deleteSecureTask } from "@/lib/secure-data"
import { getDb, createRecurringNextTask } from "@/lib/db"

// GET - Obtener todas las tareas del usuario
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    // Usar función segura que incluye cifrado/descifrado automático
    const tasks = await getSecureUserTasks(user.id, user.id, undefined, request)

    // Mapear campos nuevos que secure-data no descifra (no son sensibles)
    const db = getDb()
    const ids = (tasks as any[]).map((t: any) => t.id).filter(Boolean)
    let extraFields: Record<string, any> = {}
    if (ids.length > 0) {
      try {
        const placeholders = ids.map(() => '?').join(',')
        const result = await db.execute({
          sql: `SELECT id, recurrence, recurrence_days, recurrence_end, is_fixed_time, subtasks, pomodoro_sessions FROM tasks WHERE id IN (${placeholders})`,
          args: ids,
        })
        for (const row of result.rows) {
          extraFields[String(row.id)] = row
        }
      } catch {
        // columnas aún no migradas — ignorar
      }
    }

    const enrichedTasks = (tasks as any[]).map((t: any) => {
      const extra = extraFields[String(t.id)] || {}
      return {
        ...t,
        recurrence: extra.recurrence || 'none',
        recurrence_days: extra.recurrence_days || 0,
        recurrence_end: extra.recurrence_end || null,
        is_fixed_time: extra.is_fixed_time || 0,
        subtasks: extra.subtasks || null,
        pomodoro_sessions: extra.pomodoro_sessions || 0,
      }
    })

    return NextResponse.json({ success: true, tasks: enrichedTasks })
  } catch (error) {
    console.error("Error obteniendo tareas:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const {
      title,
      description,
      category = 'personal',
      priority = 'media',
      status = 'pendiente',
      duration = 60,
      hour = 9,
      date,
      due_date,
      tags,
      recurrence = 'none',
      recurrence_days = 0,
      recurrence_end,
      is_fixed_time = 0,
      subtasks,
      pomodoro_sessions = 0,
    } = body

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    // Validaciones
    const validCategories = ['trabajo', 'personal', 'estudio', 'salud', 'otro']
    const validPriorities = ['baja', 'media', 'alta', 'urgente']
    const validStatuses = ['pendiente', 'en-progreso', 'completada', 'cancelada']

    const finalCategory = validCategories.includes(category) ? category : 'personal'
    const finalPriority = validPriorities.includes(priority) ? priority : 'media'
    const finalStatus = validStatuses.includes(status) ? status : 'pendiente'
    const finalHour = Math.max(0, Math.min(23, Number(hour) || 9))
    const finalDate = date || new Date().toISOString().split('T')[0]
    const completed = finalStatus === 'completada' ? 1 : 0
    const tagsString = Array.isArray(tags) ? tags.join(',') : (tags || null)

    // Usar función segura que incluye cifrado automático (title, description, tags)
    await saveSecureTask(user.id, {
      title,
      description: description || null,
      category: finalCategory,
      priority: finalPriority,
      status: finalStatus,
      duration,
      completed,
      hour: finalHour,
      date: finalDate,
      due_date: due_date || null,
      tags: tagsString,
    }, request)

    // Guardar campos no cifrados con UPDATE en el registro recién creado
    try {
      const db = getDb()
      const lastResult = await db.execute({
        sql: `SELECT id FROM tasks WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
        args: [user.id],
      })
      const newId = lastResult.rows[0]?.id
      if (newId) {
        await db.execute({
          sql: `UPDATE tasks SET recurrence = ?, recurrence_days = ?, recurrence_end = ?, is_fixed_time = ?, subtasks = ?, pomodoro_sessions = ? WHERE id = ?`,
          args: [
            recurrence || 'none',
            recurrence_days || 0,
            recurrence_end || null,
            is_fixed_time ? 1 : 0,
            subtasks ? JSON.stringify(subtasks) : null,
            pomodoro_sessions || 0,
            newId,
          ],
        })
      }
    } catch {
      // columnas no migradas aún — ignorar
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Tarea creada con cifrado")
    }

    return NextResponse.json({ success: true, message: "Tarea creada exitosamente" })
  } catch (error) {
    console.error("Error creando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// PUT - Actualizar tarea
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const {
      id,
      title,
      description,
      category,
      priority,
      status,
      duration,
      completed,
      hour,
      date,
      due_date,
      tags,
      started_at,
      time_elapsed,
      completed_at,
      recurrence,
      recurrence_days,
      recurrence_end,
      is_fixed_time,
      subtasks,
      pomodoro_sessions,
    } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    // Verificar si hay cambio a 'completada' con recurrencia para crear próxima instancia
    let originalTaskForRecurrence: any = null
    if (status === 'completada') {
      try {
        const db = getDb()
        const originalResult = await db.execute({
          sql: `SELECT * FROM tasks WHERE id = ? AND user_id = ?`,
          args: [Number(id), user.id],
        })
        if (originalResult.rows.length > 0) {
          originalTaskForRecurrence = originalResult.rows[0]
        }
      } catch {
        // ignorar
      }
    }

    // Usar función segura que incluye cifrado automático
    const updatedTask = await updateSecureTask(user.id, Number(id), {
      title,
      description,
      category,
      priority,
      status,
      duration,
      completed,
      hour,
      date,
      due_date,
      tags,
      started_at,
      time_elapsed,
      completed_at,
    }, request)

    // Actualizar campos no cifrados directamente
    try {
      const db = getDb()
      const updateParts: string[] = []
      const updateArgs: any[] = []

      if (recurrence !== undefined) { updateParts.push('recurrence = ?'); updateArgs.push(recurrence) }
      if (recurrence_days !== undefined) { updateParts.push('recurrence_days = ?'); updateArgs.push(recurrence_days) }
      if (recurrence_end !== undefined) { updateParts.push('recurrence_end = ?'); updateArgs.push(recurrence_end || null) }
      if (is_fixed_time !== undefined) { updateParts.push('is_fixed_time = ?'); updateArgs.push(is_fixed_time ? 1 : 0) }
      if (subtasks !== undefined) { updateParts.push('subtasks = ?'); updateArgs.push(subtasks ? JSON.stringify(subtasks) : null) }
      if (pomodoro_sessions !== undefined) { updateParts.push('pomodoro_sessions = ?'); updateArgs.push(pomodoro_sessions) }

      if (updateParts.length > 0) {
        updateArgs.push(Number(id))
        await db.execute({
          sql: `UPDATE tasks SET ${updateParts.join(', ')} WHERE id = ?`,
          args: updateArgs,
        })
      }

      // Crear tarea recurrente si se completó una tarea con recurrencia
      if (
        status === 'completada' &&
        originalTaskForRecurrence &&
        originalTaskForRecurrence.recurrence &&
        originalTaskForRecurrence.recurrence !== 'none'
      ) {
        await createRecurringNextTask(db, originalTaskForRecurrence, user.id)
      }
    } catch {
      // columnas no migradas — ignorar
    }

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Tarea actualizada con cifrado")
    }

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (error) {
    console.error("Error actualizando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    // Usar función segura que incluye logging de auditoría
    await deleteSecureTask(user.id, Number(id), request)

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Tarea eliminada con logging de auditoría:", id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error eliminando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
