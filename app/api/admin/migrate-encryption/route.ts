import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/security-middleware'
import { migrateAllDataToFullEncryption } from '@/lib/migrate-encryption'

// POST /api/admin/migrate-encryption
// Requiere rol admin. Ejecuta la migración de datos existentes a cifrado completo.
export async function POST(request: NextRequest) {
  const { user, error } = await requireAdmin(request)
  if (error) return error

  try {
    const result = await migrateAllDataToFullEncryption()
    return NextResponse.json({ success: true, result })
  } catch (err) {
    console.error('[api/admin/migrate-encryption] Error:', err)
    return NextResponse.json(
      { success: false, error: 'Error ejecutando migración de cifrado' },
      { status: 500 }
    )
  }
}
