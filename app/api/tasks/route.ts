import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getSecureUserTasks, saveSecureTask, updateSecureTask, deleteSecureTask } from "@/lib/secure-data"

// GET - Obtener todas las tareas del usuario
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    // Usar función segura que incluye cifrado/descifrado automático
    const tasks = await getSecureUserTasks(user.id, user.id, undefined, request)

    return NextResponse.json({ success: true, tasks })
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

    // Usar función segura que incluye cifrado automático
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
    } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
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
    }, request)

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
