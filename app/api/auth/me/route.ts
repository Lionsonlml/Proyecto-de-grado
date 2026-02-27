import { type NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value

    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    // El JWT ya contiene { id, email, name } — no necesitamos consultar Turso
    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const response = NextResponse.json({
      user: { id: payload.id, email: payload.email, name: payload.name },
    })
    // Caché privada 60s: el cliente la cachea y no vuelve a pedir en cada navegación
    response.headers.set("Cache-Control", "private, max-age=60")
    return response
  } catch (error) {
    console.error("Error verificando usuario:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
