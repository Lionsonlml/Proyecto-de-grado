import { type NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/security-middleware"
import { verifyGoogleToken } from "@/lib/google-auth"
import { encryptField, decryptField } from "@/lib/encryption"
import { getUserByGoogleId, updateUserGoogleId, getDb } from "@/lib/db"

export async function POST(request: NextRequest) {
  const { user, error } = await requireAuth(request)
  if (error) return error

  try {
    const { credential } = await request.json()
    if (!credential) {
      return NextResponse.json({ error: "Token de Google requerido" }, { status: 400 })
    }

    const googlePayload = await verifyGoogleToken(credential)
    const { sub, picture } = googlePayload

    const googleIdEncrypted = encryptField(sub)

    // Verificar que ese google_id no esté vinculado a OTRO usuario
    const existingByGoogleId = await getUserByGoogleId(googleIdEncrypted)
    if (existingByGoogleId && (existingByGoogleId.id as number) !== user.id) {
      return NextResponse.json(
        { error: "Esta cuenta de Google ya está vinculada a otro usuario" },
        { status: 409 },
      )
    }

    // Verificar si el usuario ya tiene este google_id vinculado
    const db = getDb()
    const currentUser = await db.execute({
      sql: "SELECT google_id FROM users WHERE id = ?",
      args: [user.id],
    })

    const currentGoogleId = currentUser.rows[0]?.google_id as string | null
    if (currentGoogleId) {
      const decrypted = decryptField(currentGoogleId)
      if (decrypted === sub) {
        return NextResponse.json({ alreadyLinked: true, message: "Tu cuenta de Google ya estaba vinculada" })
      }
    }

    await updateUserGoogleId(user.id, googleIdEncrypted, picture)

    return NextResponse.json({ success: true, message: "Cuenta de Google vinculada correctamente" })
  } catch (err: any) {
    console.error("Error en google/link:", err)
    const msg =
      err?.message?.includes("inválido") || err?.message?.includes("no corresponde")
        ? err.message
        : "Error al vincular cuenta de Google"
    return NextResponse.json({ error: msg }, { status: 401 })
  }
}
