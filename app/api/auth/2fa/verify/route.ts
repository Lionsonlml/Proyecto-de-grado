import { type NextRequest, NextResponse } from "next/server"
import { createToken, hashToken } from "@/lib/auth"
import { getDb, getTwoFactorCode, markTwoFactorCodeUsed } from "@/lib/db"
import { decryptField } from "@/lib/encryption"

const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(request: NextRequest) {
  try {
    const { tempToken, code } = await request.json()

    if (!tempToken || !code) {
      return NextResponse.json({ error: "Token y código requeridos" }, { status: 400 })
    }

    const tempTokenHash = hashToken(tempToken)
    const record = await getTwoFactorCode(tempTokenHash)

    if (!record) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 400 })
    }

    if (new Date(record.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "Código expirado. Solicita uno nuevo." }, { status: 400 })
    }

    // Descifrar código almacenado
    const storedCode = decryptField(record.code as string) ?? (record.code as string)

    if (storedCode.trim() !== code.trim()) {
      return NextResponse.json({ error: "Código incorrecto" }, { status: 401 })
    }

    // Marcar como usado
    await markTwoFactorCodeUsed(record.id as number)

    // Obtener datos del usuario
    const db = getDb()
    const userId = record.user_id as number
    const userResult = await db.execute({
      sql: "SELECT id, email, name FROM users WHERE id = ?",
      args: [userId],
    })

    if (!userResult.rows[0]) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const { id, email, name } = userResult.rows[0] as { id: number; email: string; name: string }
    const decryptedName = decryptField(name) ?? name

    const token = await createToken({ id, email, name: decryptedName })

    const response = NextResponse.json({
      success: true,
      token,
      user: { id, email, name: decryptedName },
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
    console.error("Error verificando 2FA:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
