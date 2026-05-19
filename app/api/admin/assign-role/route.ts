import { type NextRequest, NextResponse } from "next/server"
import { ensureDbReady, getDb } from "@/lib/db"

/**
 * POST /api/admin/assign-role
 * Asigna rol admin a admin@test.com.
 * Solo funciona si se pasa el secreto correcto (ADMIN_SETUP_SECRET env var).
 * Útil para bases de datos ya existentes donde el seed no vuelve a correr.
 *
 * Body: { secret: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { secret } = await request.json()

    const expected = process.env.ADMIN_SETUP_SECRET
    if (!expected || secret !== expected) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    await ensureDbReady()
    const db = getDb()

    const adminRes = await db.execute({
      sql: "SELECT id FROM users WHERE email = ?",
      args: ["admin@test.com"],
    })

    if (adminRes.rows.length === 0) {
      return NextResponse.json({ error: "Usuario admin@test.com no encontrado" }, { status: 404 })
    }

    const adminId = adminRes.rows[0].id

    await db.execute({ sql: "DELETE FROM user_roles WHERE user_id = ?", args: [adminId] })
    await db.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, 'admin')",
      args: [adminId],
    })

    return NextResponse.json({
      success: true,
      message: "Rol admin asignado correctamente a admin@test.com",
      userId: adminId,
    })
  } catch (error) {
    console.error("[assign-role] Error:", error)
    return NextResponse.json({ error: "Error en el servidor" }, { status: 500 })
  }
}
