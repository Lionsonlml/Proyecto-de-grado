import { type NextRequest, NextResponse } from "next/server"
import { getUserByEmail, createUser, hashPassword, createToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 })
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 })
    }

    // Validar contraseña
    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 })
    }

    // Verificar si el usuario ya existe
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 })
    }

    // Crear usuario
    const hashedPassword = await hashPassword(password)
    const userId = await createUser(email, hashedPassword, name)

    // Crear token
    const token = await createToken({
      id: userId,
      email,
      name,
    })

    const response = NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
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
    console.error("Error en registro:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
