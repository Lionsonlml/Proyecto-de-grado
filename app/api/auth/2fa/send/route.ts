import { type NextRequest, NextResponse } from "next/server"
import { hashToken } from "@/lib/auth"
import { getDb, getTwoFactorCode, saveTwoFactorCode } from "@/lib/db"
import { encryptField, decryptField } from "@/lib/encryption"
import { sendTwoFactorCode } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const { tempToken } = await request.json()
    if (!tempToken) {
      return NextResponse.json({ error: "Token de sesión requerido" }, { status: 400 })
    }

    const tempTokenHash = hashToken(tempToken)
    const record = await getTwoFactorCode(tempTokenHash)

    if (!record) {
      return NextResponse.json({ error: "Sesión inválida o expirada" }, { status: 400 })
    }

    // Verificar no expirado
    if (new Date(record.expires_at as string) < new Date()) {
      return NextResponse.json({ error: "Sesión expirada. Vuelve a iniciar sesión." }, { status: 400 })
    }

    const userId = record.user_id as number

    // Obtener email del usuario
    const db = getDb()
    const userResult = await db.execute({ sql: "SELECT email, name FROM users WHERE id = ?", args: [userId] })
    if (!userResult.rows[0]) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    const email = userResult.rows[0].email as string
    const name = userResult.rows[0].name as string

    // Generar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const codeEncrypted = encryptField(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Guardar código cifrado (reutilizamos la fila existente con la nueva función)
    await saveTwoFactorCode(userId, codeEncrypted, tempTokenHash, expiresAt)

    const result = await sendTwoFactorCode(email, name, code)

    return NextResponse.json({
      success: true,
      ...(result.code ? { code: result.code } : {}),
    })
  } catch (error) {
    console.error("Error enviando código 2FA:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
