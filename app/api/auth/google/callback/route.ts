import { type NextRequest, NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { createToken, hashToken, getUserByEmail } from "@/lib/auth"
import { encryptField } from "@/lib/encryption"
import {
  ensureDbReady,
  getUserByGoogleId,
  updateUserGoogleId,
  createGoogleUser,
  getTwoFactorEnabled,
  saveTwoFactorCode,
} from "@/lib/db"

const THIRTY_DAYS = 60 * 60 * 24 * 30

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const loginUrl = (err: string) => new URL(`/login?error=${err}`, origin)

  if (error === "access_denied") {
    return NextResponse.redirect(loginUrl("google_denied"))
  }

  // Verificar CSRF state
  const storedState = request.cookies.get("oauth_state")?.value
  if (!state || !storedState || state !== storedState) {
    return NextResponse.redirect(loginUrl("invalid_state"))
  }

  if (!code) {
    return NextResponse.redirect(loginUrl("no_code"))
  }

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? origin
  const redirectUri = `${appUrl}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(loginUrl("google_not_configured"))
  }

  try {
    // Intercambiar code por tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    const tokens = await tokenRes.json()

    if (!tokenRes.ok || !tokens.id_token) {
      console.error("Google token exchange failed:", tokens)
      return NextResponse.redirect(loginUrl("google_error"))
    }

    // Verificar id_token y obtener datos del usuario
    const infoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(tokens.id_token)}`,
    )
    const info = await infoRes.json()

    if (!infoRes.ok || !info.sub) {
      return NextResponse.redirect(loginUrl("google_error"))
    }

    const { sub, email, name, picture } = info

    if (!email) {
      return NextResponse.redirect(loginUrl("google_no_email"))
    }

    await ensureDbReady()

    const googleIdEncrypted = encryptField(sub)
    let user = await getUserByGoogleId(googleIdEncrypted)

    if (!user) {
      const existingByEmail = await getUserByEmail(email)
      if (existingByEmail) {
        // Vincular cuenta existente con Google
        await updateUserGoogleId(existingByEmail.id, googleIdEncrypted, picture ?? "")
        user = existingByEmail
      } else {
        // Crear usuario nuevo
        const nameEncrypted = encryptField(name ?? email)
        const userId = await createGoogleUser(email, nameEncrypted, googleIdEncrypted, picture ?? "")
        user = { id: userId, email, name: name ?? email }
      }
    }

    const userId = user.id as number
    const userName = (user.name as string) ?? name ?? email

    // ── Flujo 2FA ────────────────────────────────────────────────────────────
    const twoFAEnabled = await getTwoFactorEnabled(userId)
    if (twoFAEnabled) {
      const tempToken = randomBytes(16).toString("hex")
      const tempTokenHash = hashToken(tempToken)
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
      await saveTwoFactorCode(userId, "", tempTokenHash, expiresAt)

      const twoFAUrl = new URL("/2fa", origin)
      twoFAUrl.searchParams.set("tempToken", tempToken)
      const twoFAResponse = NextResponse.redirect(twoFAUrl)
      twoFAResponse.cookies.delete("oauth_state")
      return twoFAResponse
    }

    // ── Login directo ─────────────────────────────────────────────────────────
    const token = await createToken({ id: userId, email, name: userName })

    const dashboardUrl = new URL("/dashboard", origin)
    const response = NextResponse.redirect(dashboardUrl)

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax", // lax para que la cookie llegue en el redirect
      maxAge: THIRTY_DAYS,
      path: "/",
    })
    response.cookies.delete("oauth_state")

    return response
  } catch (err) {
    console.error("Error en Google OAuth callback:", err)
    return NextResponse.redirect(loginUrl("google_error"))
  }
}
