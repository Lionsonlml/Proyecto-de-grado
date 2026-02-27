import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getSecureUserTasks, getSecureUserMoods } from "@/lib/secure-data"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") || undefined

    const [tasksResult, moodsResult] = await Promise.allSettled([
      getSecureUserTasks(user.id, user.id, date, request),
      getSecureUserMoods(user.id, user.id, date, request),
    ])

    const tasks = tasksResult.status === "fulfilled" ? tasksResult.value : []
    const moods = moodsResult.status === "fulfilled" ? moodsResult.value : []

    if (tasksResult.status === "rejected") {
      console.error("Error obteniendo tareas:", tasksResult.reason)
    }
    if (moodsResult.status === "rejected") {
      console.error("Error obteniendo moods:", moodsResult.reason)
    }

    return NextResponse.json({ success: true, tasks, moods })
  } catch (error) {
    console.error("Error obteniendo datos del usuario:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
