import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, verifyPassword, createToken } from "@/lib/auth"
import { ensureDbReady } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
    }

    // Esperar a que la DB esté lista (tablas creadas) antes de consultar
    await ensureDbReady()

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.password)

    if (!isValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    const token = await createToken({
      id: user.id,
      email: user.email,
      name: user.name,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 7, // 7 días
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
