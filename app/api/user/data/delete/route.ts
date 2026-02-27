import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { deleteUserData } from '@/lib/privacy'

export async function DELETE(request: NextRequest) {
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

    // Verificar confirmación en el body
    const body = await request.json()
    if (!body.confirm || body.confirm !== 'DELETE_ALL_MY_DATA') {
      return NextResponse.json(
        { error: 'Confirmación requerida para eliminar todos los datos' },
        { status: 400 }
      )
    }

    // Eliminar todos los datos del usuario
    await deleteUserData(user.id)

    // Limpiar cookie de autenticación
    const response = NextResponse.json(
      { message: 'Todos los datos han sido eliminados exitosamente' },
      { status: 200 }
    )

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
    })

    return response
  } catch (error) {
    console.error('Error eliminando datos del usuario:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
