import { NextResponse, type NextRequest } from "next/server"
import { verifyToken, readAuthToken } from "@/lib/auth"
import { getSecureUserMoods, saveSecureMood } from "@/lib/secure-data"
import { getCurrentDateTime } from "@/lib/utils"
import { ensureDbReady } from "@/lib/db"

// GET - Obtener todos los moods del usuario
export async function GET(request: NextRequest) {
  try {
    await ensureDbReady()

    const token = readAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

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
    await ensureDbReady()

    const token = readAuthToken(request)
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const body = await request.json()
    const { energy, focus, stress, type, hour, date, notes } = body

    const energyNum = Number(energy)
    const focusNum = Number(focus) || 3
    const stressNum = Number(stress) || 3

    if (!energyNum || !type) {
      return NextResponse.json({ error: "Energía y tipo son requeridos" }, { status: 400 })
    }

    if (energyNum < 1 || energyNum > 5) {
      return NextResponse.json({ error: "Energía debe estar entre 1 y 5" }, { status: 400 })
    }

    const currentDateTime = getCurrentDateTime()

    await saveSecureMood(user.id, {
      energy: energyNum,
      focus: focusNum,
      stress: stressNum,
      type: String(type),
      hour: hour !== undefined && hour !== null ? Number(hour) : currentDateTime.hour,
      date: date || currentDateTime.date,
      notes: notes || undefined,
    }, request)

    return NextResponse.json({ success: true, message: "Mood creado exitosamente" })
  } catch (error) {
    console.error("Error creando mood:", error)
    return NextResponse.json({ error: "Error en el servidor", detail: String(error) }, { status: 500 })
  }
}
