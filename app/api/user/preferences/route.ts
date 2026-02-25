import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { getUserPreferences, saveUserPreferences, recordConsent } from '@/lib/privacy'

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

    // Obtener preferencias del usuario
    const preferences = await getUserPreferences(user.id)

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error obteniendo preferencias:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { preferences, consent } = body

    // Validar datos de entrada
    if (!preferences || typeof preferences !== 'object') {
      return NextResponse.json(
        { error: 'Preferencias inválidas' },
        { status: 400 }
      )
    }

    // Guardar preferencias
    await saveUserPreferences({
      user_id: user.id,
      data_collection: Boolean(preferences.data_collection),
      ai_analysis: Boolean(preferences.ai_analysis),
      data_sharing: Boolean(preferences.data_sharing),
      marketing_emails: Boolean(preferences.marketing_emails),
      analytics_tracking: Boolean(preferences.analytics_tracking),
    })

    // Registrar consentimiento si se proporciona
    if (consent) {
      const clientIP = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      await recordConsent({
        user_id: user.id,
        scope: consent.scope || 'general',
        accepted: Boolean(consent.accepted),
        version: consent.version || '1.0',
        ip_address: clientIP,
        user_agent: userAgent,
      })
    }

    return NextResponse.json({ message: 'Preferencias guardadas exitosamente' })
  } catch (error) {
    console.error('Error guardando preferencias:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
