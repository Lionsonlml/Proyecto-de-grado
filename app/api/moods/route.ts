import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getDb } from "@/lib/db"
import { getCurrentDateTime } from "@/lib/utils"

// GET - Obtener todos los moods del usuario
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const db = getDb()
    const result = await db.execute({
      sql: "SELECT * FROM moods WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      args: [user.id],
    })

    return NextResponse.json({ success: true, moods: result.rows })
  } catch (error) {
    console.error("Error obteniendo moods:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// POST - Crear nuevo mood
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const { energy, focus, stress, type, hour, date, notes } = body

    if (!energy || !type) {
      return NextResponse.json({ error: "Energía y tipo son requeridos" }, { status: 400 })
    }

    // Usar la zona horaria local correcta
    const currentDateTime = getCurrentDateTime()

    const db = getDb()
    const result = await db.execute({
      sql: "INSERT INTO moods (user_id, energy, focus, stress, type, hour, date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *",
      args: [
        user.id, 
        energy, 
        focus || 3,
        stress || 3,
        type, 
        hour || currentDateTime.hour, 
        date || currentDateTime.date,
        notes || null
      ],
    })

    return NextResponse.json({ success: true, mood: result.rows[0] })
  } catch (error) {
    console.error("Error creando mood:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

