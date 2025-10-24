import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getDb } from "@/lib/db"

// GET - Obtener todas las tareas del usuario
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const db = getDb()
    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE user_id = ? ORDER BY date DESC, hour ASC",
      args: [user.id],
    })

    return NextResponse.json({ success: true, tasks: result.rows })
  } catch (error) {
    console.error("Error obteniendo tareas:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// POST - Crear nueva tarea
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
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
    } = body

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 })
    }

    const db = getDb()
    
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

    const result = await db.execute({
      sql: `INSERT INTO tasks (
        user_id, title, description, category, priority, status, 
        duration, completed, hour, date, due_date, tags
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      args: [
        user.id,
        title,
        description || null,
        finalCategory,
        finalPriority,
        finalStatus,
        duration,
        completed,
        finalHour,
        finalDate,
        due_date || null,
        tagsString,
      ],
    })

    console.log("✅ Tarea creada:", result.rows[0])

    return NextResponse.json({ success: true, task: result.rows[0] })
  } catch (error) {
    console.error("Error creando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// PUT - Actualizar tarea
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
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
    } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const db = getDb()
    
    // Construir query dinámicamente
    const updates: string[] = []
    const args: any[] = []
    
    if (title !== undefined) { updates.push("title = ?"); args.push(title) }
    if (description !== undefined) { updates.push("description = ?"); args.push(description) }
    if (category !== undefined) { updates.push("category = ?"); args.push(category) }
    if (priority !== undefined) { updates.push("priority = ?"); args.push(priority) }
    if (status !== undefined) {
      updates.push("status = ?")
      args.push(status)
      // Actualizar completed basado en status
      const isCompleted = status === 'completada' ? 1 : 0
      updates.push("completed = ?")
      args.push(isCompleted)
      
      // Si cambia a en-progreso, registrar started_at
      if (status === 'en-progreso') {
        updates.push("started_at = CURRENT_TIMESTAMP")
      }
      
      // Si se completa, registrar completed_at
      if (status === 'completada') {
        updates.push("completed_at = CURRENT_TIMESTAMP")
      }
    } else if (completed !== undefined) {
      updates.push("completed = ?")
      args.push(completed ? 1 : 0)
    }
    if (duration !== undefined) { updates.push("duration = ?"); args.push(duration) }
    if (hour !== undefined) { updates.push("hour = ?"); args.push(Math.max(0, Math.min(23, Number(hour)))) }
    if (date !== undefined) { updates.push("date = ?"); args.push(date) }
    if (due_date !== undefined) { updates.push("due_date = ?"); args.push(due_date) }
    if (tags !== undefined) {
      const tagsString = Array.isArray(tags) ? tags.join(',') : tags
      updates.push("tags = ?")
      args.push(tagsString)
    }
    if (body.started_at !== undefined) { updates.push("started_at = ?"); args.push(body.started_at) }
    if (body.time_elapsed !== undefined) { updates.push("time_elapsed = ?"); args.push(body.time_elapsed) }
    
    updates.push("updated_at = CURRENT_TIMESTAMP")
    
    args.push(id, user.id)
    
    await db.execute({
      sql: `UPDATE tasks SET ${updates.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    })

    const result = await db.execute({
      sql: "SELECT * FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    })

    console.log("✅ Tarea actualizada:", result.rows[0])

    return NextResponse.json({ success: true, task: result.rows[0] })
  } catch (error) {
    console.error("Error actualizando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// DELETE - Eliminar tarea
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const db = getDb()
    await db.execute({
      sql: "DELETE FROM tasks WHERE id = ? AND user_id = ?",
      args: [id, user.id],
    })

    console.log("✅ Tarea eliminada:", id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error eliminando tarea:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
