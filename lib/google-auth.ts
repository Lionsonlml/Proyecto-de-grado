/**
 * Verificación de Google ID tokens via el endpoint tokeninfo de Google.
 * No requiere ninguna librería extra: solo fetch HTTP.
 */

export interface GoogleTokenPayload {
  sub: string         // Google user ID
  email: string
  name: string
  picture: string
  email_verified: boolean
}

export async function verifyGoogleToken(credential: string): Promise<GoogleTokenPayload> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID no configurado")
  }

  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(credential)}`,
  )

  if (!res.ok) {
    throw new Error("Token de Google inválido")
  }

  const data = await res.json()

  if (data.aud !== clientId) {
    throw new Error("Token de Google no corresponde a este cliente")
  }

  if (!data.email_verified) {
    throw new Error("Email de Google no verificado")
  }

  return {
    sub: data.sub,
    email: data.email,
    name: data.name ?? data.email,
    picture: data.picture ?? "",
    email_verified: data.email_verified === "true" || data.email_verified === true,
  }
}
