import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './auth'
import { canUserAccessData } from './secure-data'
import { logDataAccess } from './roles'

// Middleware para verificar autenticación y permisos
export async function requireAuth(request: NextRequest): Promise<{ user: any; error?: NextResponse }> {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token) {
    return { 
      user: null, 
      error: NextResponse.json({ error: 'No autenticado' }, { status: 401 }) 
    }
  }

  const user = await verifyToken(token)
  if (!user) {
    return { 
      user: null, 
      error: NextResponse.json({ error: 'Token inválido' }, { status: 401 }) 
    }
  }

  return { user }
}

// Middleware para verificar acceso a datos de usuario específico
export async function requireUserDataAccess(
  request: NextRequest, 
  targetUserId: number, 
  dataType: string
): Promise<{ user: any; error?: NextResponse }> {
  const { user, error } = await requireAuth(request)
  
  if (error) return { user: null, error }

  // Verificar que el usuario puede acceder a los datos del targetUserId
  const hasAccess = await canUserAccessData(user.id, targetUserId, dataType)
  
  if (!hasAccess) {
    return { 
      user: null, 
      error: NextResponse.json({ error: 'No tienes permisos para acceder a estos datos' }, { status: 403 }) 
    }
  }

  // Registrar acceso en logs de auditoría
  const clientIP = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  await logDataAccess(user.id, 'read', dataType, targetUserId, clientIP, userAgent)

  return { user }
}

// Middleware para verificar permisos de administrador
export async function requireAdmin(request: NextRequest): Promise<{ user: any; error?: NextResponse }> {
  const { user, error } = await requireAuth(request)
  
  if (error) return { user: null, error }

  // Verificar si el usuario es administrador
  const { getUserRole } = await import('./roles')
  const role = await getUserRole(user.id)
  
  if (role !== 'admin') {
    return { 
      user: null, 
      error: NextResponse.json({ error: 'Se requieren permisos de administrador' }, { status: 403 }) 
    }
  }

  return { user }
}

// Middleware para verificar consentimiento de privacidad
export async function requirePrivacyConsent(request: NextRequest, dataType: string): Promise<{ user: any; error?: NextResponse }> {
  const { user, error } = await requireAuth(request)
  
  if (error) return { user: null, error }

  // Verificar si el usuario ha dado consentimiento para el tipo de datos
  const { getUserPreferences } = await import('./privacy')
  const preferences = await getUserPreferences(user.id)
  
  if (!preferences) {
    return { 
      user: null, 
      error: NextResponse.json({ 
        error: 'Debes configurar tus preferencias de privacidad primero',
        requiresConsent: true 
      }, { status: 403 }) 
    }
  }

  // Verificar consentimiento específico según el tipo de datos
  switch (dataType) {
    case 'moods':
    case 'insights':
      if (!preferences.data_collection) {
        return { 
          user: null, 
          error: NextResponse.json({ 
            error: 'No tienes consentimiento para acceder a estos datos sensibles',
            requiresConsent: true 
          }, { status: 403 }) 
        }
      }
      break
    case 'ai_analysis':
      if (!preferences.ai_analysis) {
        return { 
          user: null, 
          error: NextResponse.json({ 
            error: 'No tienes consentimiento para análisis con IA',
            requiresConsent: true 
          }, { status: 403 }) 
        }
      }
      break
  }

  return { user }
}

// Función para validar entrada de datos
export function validateInput(data: any, requiredFields: string[]): { valid: boolean; error?: string } {
  for (const field of requiredFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      return { valid: false, error: `El campo ${field} es requerido` }
    }
  }
  return { valid: true }
}

// Función para sanitizar entrada de datos
export function sanitizeInput(data: any): any {
  const sanitized = { ...data }
  
  // Remover campos potencialmente peligrosos
  const dangerousFields = ['__proto__', 'constructor', 'prototype']
  dangerousFields.forEach(field => {
    delete sanitized[field]
  })
  
  // Limitar longitud de strings
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'string' && sanitized[key].length > 10000) {
      sanitized[key] = sanitized[key].substring(0, 10000)
    }
  })
  
  return sanitized
}

// Función para verificar rate limiting (básico)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(identifier: string, maxRequests = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const key = identifier
  const current = rateLimitMap.get(key)
  
  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (current.count >= maxRequests) {
    return false
  }
  
  current.count++
  return true
}

// Middleware para rate limiting
export function requireRateLimit(request: NextRequest, maxRequests = 100, windowMs = 60000): { allowed: boolean; error?: NextResponse } {
  const clientIP = request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
  
  const allowed = checkRateLimit(clientIP, maxRequests, windowMs)
  
  if (!allowed) {
    return { 
      allowed: false, 
      error: NextResponse.json({ 
        error: 'Demasiadas solicitudes. Inténtalo más tarde.' 
      }, { status: 429 }) 
    }
  }
  
  return { allowed: true }
}
