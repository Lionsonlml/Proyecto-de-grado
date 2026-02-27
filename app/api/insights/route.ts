import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { getSecureUserInsights } from "@/lib/secure-data"

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })

    const user = await verifyToken(token)
    if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get("limit") || "20")
    const type = searchParams.get("type") || undefined

    const insights = await getSecureUserInsights(user.id, user.id, limit, request, type)

    return NextResponse.json({ success: true, insights })
  } catch (error) {
    console.error("Error obteniendo insights:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}

