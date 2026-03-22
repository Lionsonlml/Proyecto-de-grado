import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

export async function GET() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth no configurado" }, { status: 500 })
  }

  // state token para protección CSRF
  const state = randomBytes(16).toString("hex")

  const redirectUri = `${appUrl}/api/auth/google/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  })

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`

  const response = NextResponse.redirect(authUrl)

  // Guardar state en cookie httpOnly para verificarlo en el callback
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // lax es necesario para que la cookie llegue en el redirect de vuelta
    maxAge: 60 * 10, // 10 minutos
    path: "/",
  })

  return response
}
