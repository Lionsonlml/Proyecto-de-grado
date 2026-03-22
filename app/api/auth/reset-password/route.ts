import { type NextRequest, NextResponse } from "next/server"
import { hashToken } from "@/lib/auth"
import { hashPassword } from "@/lib/auth"
import { getPasswordResetToken, markPasswordResetTokenUsed, updateUserPassword } from "@/lib/db"

const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d).{8,}$/

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token y nueva contraseña requeridos" }, { status: 400 })
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número" },
        { status: 400 },
      )
    }

    const tokenHash = hashToken(token)
    const record = await getPasswordResetToken(tokenHash)

    if (!record) {
      return NextResponse.json({ error: "Token inválido o ya utilizado" }, { status: 400 })
    }

    if (new Date(record.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 })
    }

    const hashedPwd = await hashPassword(newPassword)
    await updateUserPassword(record.user_id as number, hashedPwd)
    await markPasswordResetTokenUsed(record.id as number)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en reset-password:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
