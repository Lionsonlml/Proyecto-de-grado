import { getDb } from './db'

export type UserRole = 'user' | 'admin' | 'moderator'

export interface RolePermissions {
  canViewAllUsers: boolean
  canModifyUserData: boolean
  canAccessAnalytics: boolean
  canManageSystem: boolean
  canViewAuditLogs: boolean
  canExportAllData: boolean
}

// Definir permisos por rol
const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  user: {
    canViewAllUsers: false,
    canModifyUserData: false,
    canAccessAnalytics: false,
    canManageSystem: false,
    canViewAuditLogs: false,
    canExportAllData: false,
  },
  moderator: {
    canViewAllUsers: true,
    canModifyUserData: false,
    canAccessAnalytics: true,
    canManageSystem: false,
    canViewAuditLogs: true,
    canExportAllData: false,
  },
  admin: {
    canViewAllUsers: true,
    canModifyUserData: true,
    canAccessAnalytics: true,
    canManageSystem: true,
    canViewAuditLogs: true,
    canExportAllData: true,
  },
}

// Obtener rol de usuario
export async function getUserRole(userId: number): Promise<UserRole> {
  const db = getDb()
  const result = await db.execute({
    sql: "SELECT role FROM user_roles WHERE user_id = ?",
    args: [userId],
  })
  
  if (result.rows.length === 0) {
    // Si no tiene rol asignado, crear uno por defecto
    await assignUserRole(userId, 'user')
    return 'user'
  }
  
  return result.rows[0].role as UserRole
}

// Asignar rol a usuario
export async function assignUserRole(userId: number, role: UserRole): Promise<void> {
  const db = getDb()
  
  // Verificar si ya tiene un rol
  const existing = await db.execute({
    sql: "SELECT id FROM user_roles WHERE user_id = ?",
    args: [userId],
  })
  
  if (existing.rows.length > 0) {
    // Actualizar rol existente
    await db.execute({
      sql: "UPDATE user_roles SET role = ? WHERE user_id = ?",
      args: [role, userId],
    })
  } else {
    // Crear nuevo rol
    await db.execute({
      sql: "INSERT INTO user_roles (user_id, role) VALUES (?, ?)",
      args: [userId, role],
    })
  }
}

// Obtener permisos de usuario
export async function getUserPermissions(userId: number): Promise<RolePermissions> {
  const role = await getUserRole(userId)
  return ROLE_PERMISSIONS[role]
}

// Verificar si usuario tiene permiso específico
export async function hasPermission(userId: number, permission: keyof RolePermissions): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  return permissions[permission]
}

// Verificar acceso a datos de usuario específico
export async function canAccessUserData(requestingUserId: number, targetUserId: number): Promise<boolean> {
  // Un usuario siempre puede acceder a sus propios datos
  if (requestingUserId === targetUserId) {
    return true
  }
  
  // Verificar si el usuario solicitante tiene permisos de administrador
  const canModify = await hasPermission(requestingUserId, 'canModifyUserData')
  const canViewAll = await hasPermission(requestingUserId, 'canViewAllUsers')
  
  return canModify || canViewAll
}

// Verificar acceso a datos sensibles
export async function canAccessSensitiveData(userId: number, dataType: 'moods' | 'insights' | 'tasks'): Promise<boolean> {
  const permissions = await getUserPermissions(userId)
  
  // Los administradores pueden acceder a todo
  if (permissions.canModifyUserData) {
    return true
  }
  
  // Los usuarios normales solo pueden acceder a sus propios datos
  // y solo si han dado consentimiento
  const { canAccessSensitiveData } = await import('./privacy')
  return await canAccessSensitiveData(userId)
}

// Registrar acceso a datos (auditoría)
export async function logDataAccess(
  userId: number, 
  action: string, 
  dataType: string, 
  targetUserId?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  const db = getDb()
  
  await db.execute({
    sql: `INSERT INTO data_access_logs 
      (user_id, action, data_type, target_user_id, ip_address, user_agent, accessed_at) 
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    args: [userId, action, dataType, targetUserId || null, ipAddress || null, userAgent || null],
  })
}

// Obtener logs de acceso (solo para administradores)
export async function getAccessLogs(userId: number, limit = 100): Promise<any[]> {
  const canView = await hasPermission(userId, 'canViewAuditLogs')
  if (!canView) {
    throw new Error('No tienes permisos para ver los logs de acceso')
  }
  
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM data_access_logs 
      ORDER BY accessed_at DESC 
      LIMIT ?`,
    args: [limit],
  })
  
  return result.rows
}

// Middleware para verificar permisos
export function requirePermission(permission: keyof RolePermissions) {
  return async (userId: number): Promise<boolean> => {
    return await hasPermission(userId, permission)
  }
}

// Middleware para verificar acceso a datos de usuario
export function requireUserDataAccess(targetUserId: number) {
  return async (requestingUserId: number): Promise<boolean> => {
    return await canAccessUserData(requestingUserId, targetUserId)
  }
}
