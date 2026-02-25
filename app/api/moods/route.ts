import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getSecureUserMoods, saveSecureMood } from "@/lib/secure-data"
import { getCurrentDateTime } from "@/lib/utils"

// GET - Obtener todos los moods del usuario
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    // Usar función segura que incluye cifrado/descifrado automático
    const moods = await getSecureUserMoods(user.id, user.id, undefined, request)

    return NextResponse.json({ success: true, moods })
  } catch (error) {
    console.error("Error obteniendo moods:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

// POST - Crear nuevo mood
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
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

    // Usar función segura que incluye cifrado automático
    await saveSecureMood(user.id, {
      energy,
      focus: focus || 3,
      stress: stress || 3,
      type,
      hour: hour || currentDateTime.hour,
      date: date || currentDateTime.date,
      notes: notes || null,
    }, request)

    return NextResponse.json({ success: true, message: "Mood creado exitosamente" })
  } catch (error) {
    console.error("Error creando mood:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

