/**
 * Servicio de email — implementación mock para desarrollo.
 * En producción, reemplazar con un proveedor real (Resend, SendGrid, etc.)
 */

const isDev = process.env.NODE_ENV !== "production"

export async function sendTwoFactorCode(
  email: string,
  name: string,
  code: string,
): Promise<{ success: boolean; code?: string }> {
  console.log(`[Email 2FA] Para: ${email} (${name}) | Código: ${code}`)

  if (isDev) {
    return { success: true, code }
  }

  // TODO: integrar proveedor de email real
  return { success: true }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<{ success: boolean; url?: string }> {
  console.log(`[Email Reset] Para: ${email} (${name}) | URL: ${resetUrl}`)

  if (isDev) {
    return { success: true, url: resetUrl }
  }

  // TODO: integrar proveedor de email real
  return { success: true }
}
