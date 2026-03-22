import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { hashToken } from "@/lib/auth"
import { getUserByEmail } from "@/lib/auth"
import { ensureDbReady, savePasswordResetToken } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email-service"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 })
    }

    await ensureDbReady()

    // Respuesta siempre 200 para no revelar si el email existe
    const user = await getUserByEmail(email)

    if (!user) {
      return NextResponse.json({ success: true })
    }

    const token = randomBytes(32).toString("hex")
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hora

    await savePasswordResetToken(user.id, tokenHash, expiresAt)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const resetUrl = `${baseUrl}/reset-password?token=${token}`

    const result = await sendPasswordResetEmail(email, user.name, resetUrl)

    return NextResponse.json({
      success: true,
      ...(result.url ? { resetUrl: result.url } : {}),
    })
  } catch (error) {
    console.error("Error en forgot-password:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
