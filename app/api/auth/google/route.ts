import { type NextRequest, NextResponse } from "next/server"
import { createToken, hashToken } from "@/lib/auth"
import { ensureDbReady, getUserByGoogleId, updateUserGoogleId, createGoogleUser, getTwoFactorEnabled, saveTwoFactorCode } from "@/lib/db"
import { getUserByEmail } from "@/lib/auth"
import { encryptField } from "@/lib/encryption"
import { verifyGoogleToken } from "@/lib/google-auth"
import { randomBytes } from "crypto"

const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function POST(request: NextRequest) {
  try {
    const { credential } = await request.json()
    if (!credential) {
      return NextResponse.json({ error: "Token de Google requerido" }, { status: 400 })
    }

    await ensureDbReady()

    // Verificar token con Google
    const googlePayload = await verifyGoogleToken(credential)
    const { sub, email, name, picture } = googlePayload

    const googleIdEncrypted = encryptField(sub)

    // 1. Buscar por google_id cifrado
    let user = await getUserByGoogleId(googleIdEncrypted)

    if (!user) {
      // 2. Buscar por email
      const existingByEmail = await getUserByEmail(email)

      if (existingByEmail) {
        // Vincular cuenta existente con Google
        await updateUserGoogleId(existingByEmail.id, googleIdEncrypted, picture)
        user = { ...existingByEmail, id: existingByEmail.id, email: existingByEmail.email, name: existingByEmail.name }
      } else {
        // Crear usuario nuevo
        const nameEncrypted = encryptField(name)
        const userId = await createGoogleUser(email, nameEncrypted, googleIdEncrypted, picture)
        user = { id: userId, email, name }
      }
    }

    const userId = user.id as number
    const userName = (user.name as string) ?? name

    // ── Flujo 2FA ─────────────────────────────────────────────────────────────
    const twoFAEnabled = await getTwoFactorEnabled(userId)
    if (twoFAEnabled) {
      const tempToken = randomBytes(16).toString("hex")
      const tempTokenHash = hashToken(tempToken)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      await saveTwoFactorCode(userId, "", tempTokenHash, expiresAt)
      return NextResponse.json({ requiresTwoFactor: true, tempToken })
    }

    // ── Login directo ──────────────────────────────────────────────────────────
    const token = await createToken({ id: userId, email, name: userName })

    const response = NextResponse.json({
      success: true,
      token,
      user: { id: userId, email, name: userName, avatar: picture },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: THIRTY_DAYS,
      path: "/",
    })

    return response
  } catch (error: any) {
    console.error("Error en Google OAuth:", error)
    const msg = error?.message?.includes("inválido") || error?.message?.includes("no corresponde")
      ? error.message
      : "Error en autenticación con Google"
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
