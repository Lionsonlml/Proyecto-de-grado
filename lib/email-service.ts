import nodemailer from "nodemailer"

const hasCredentials = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
const isDev = process.env.NODE_ENV !== "production"

const transporter = hasCredentials
  ? nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    })
  : null

export async function sendTwoFactorCode(
  email: string,
  name: string,
  code: string,
): Promise<{ success: boolean; code?: string }> {
  if (!hasCredentials || !transporter) {
    console.log(`[Email 2FA] Para: ${email} (${name}) | Código: ${code}`)
    return { success: true, code }
  }

  try {
    await transporter.sendMail({
      from: `"TimeWize" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Tu código de verificación — TimeWize",
      html: buildTwoFactorHtml(name, code),
    })
    return { success: true }
  } catch (err) {
    console.error("[Email 2FA] Error:", err)
    if (isDev) return { success: true, code }
    return { success: false }
  }
}

export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetUrl: string,
): Promise<{ success: boolean; url?: string }> {
  if (!hasCredentials || !transporter) {
    console.log(`[Email Reset] Para: ${email} (${name}) | URL: ${resetUrl}`)
    return { success: true, url: resetUrl }
  }

  try {
    await transporter.sendMail({
      from: `"TimeWize" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Restablece tu contraseña — TimeWize",
      html: buildPasswordResetHtml(name, resetUrl),
    })
    return { success: true, ...(isDev ? { url: resetUrl } : {}) }
  } catch (err) {
    console.error("[Email Reset] Error:", err)
    if (isDev) return { success: true, url: resetUrl }
    return { success: false }
  }
}

// ─── Plantillas HTML ───────────────────────────────────────────────────────

function buildPasswordResetHtml(name: string, resetUrl: string): string {
  const displayName = name ?? "usuario"
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Restablecer contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:8px;">
                <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">⏱ TimeWize</span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Hola, ${displayName}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en TimeWize.
                Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                  Restablecer contraseña
                </a>
              </div>
              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;line-height:1.5;">
                O copia y pega este enlace en tu navegador:
              </p>
              <p style="margin:0 0 24px;font-size:12px;color:#9ca3af;word-break:break-all;">${resetUrl}</p>
              <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                  Este enlace expirará en <strong>1 hora</strong>. Si no solicitaste este cambio, puedes ignorar este email — tu contraseña no será modificada.
                </p>
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} TimeWize · Gestión inteligente del tiempo
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildTwoFactorHtml(name: string, code: string): string {
  const displayName = name ?? "usuario"
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Código de verificación</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">⏱ TimeWize</span>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;color:#111827;">Hola, ${displayName}</h1>
              <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
                Tu código de verificación de dos factores es:
              </p>
              <div style="text-align:center;margin:32px 0;">
                <span style="display:inline-block;padding:16px 40px;background:#f3f4f6;border-radius:12px;font-size:36px;font-weight:700;color:#111827;letter-spacing:8px;">${code}</span>
              </div>
              <div style="border-top:1px solid #f3f4f6;padding-top:20px;">
                <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.5;">
                  Este código expira en <strong>10 minutos</strong>. No lo compartas con nadie.
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${new Date().getFullYear()} TimeWize · Gestión inteligente del tiempo
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
