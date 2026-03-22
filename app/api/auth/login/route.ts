import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { getUserByEmail, verifyPassword, createToken, hashToken } from "@/lib/auth"
import { ensureDbReady, getTwoFactorEnabled, saveTwoFactorCode } from "@/lib/db"

const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 })
    }

    await ensureDbReady()

    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // Usuarios de Google sin contraseña local
    if (!user.password) {
      return NextResponse.json(
        { error: "Esta cuenta usa Google Sign-In. Por favor inicia sesión con Google." },
        { status: 401 },
      )
    }

    const isValid = await verifyPassword(password, user.password)
    if (!isValid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 })
    }

    // ── Flujo 2FA ────────────────────────────────────────────────────────────
    const twoFAEnabled = await getTwoFactorEnabled(user.id)
    if (twoFAEnabled) {
      const tempToken = randomBytes(16).toString("hex")
      const tempTokenHash = hashToken(tempToken)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

      // Guardamos el registro vacío (el código se rellena en /api/auth/2fa/send)
      await saveTwoFactorCode(user.id, "", tempTokenHash, expiresAt)

      return NextResponse.json({ requiresTwoFactor: true, tempToken })
    }

    // ── Login normal ─────────────────────────────────────────────────────────
    const token = await createToken({ id: user.id, email: user.email, name: user.name })

    const response = NextResponse.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: THIRTY_DAYS,
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Error en login:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
