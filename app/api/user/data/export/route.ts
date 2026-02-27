import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { exportUserData } from '@/lib/privacy'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    // Exportar datos del usuario
    const userData = await exportUserData(user.id)

    // Crear respuesta con datos en formato JSON
    const response = NextResponse.json(userData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="timewize-data-${user.id}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })

    return response
  } catch (error) {
    console.error('Error exportando datos del usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
