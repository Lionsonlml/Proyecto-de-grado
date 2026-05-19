import { describe, it, expect } from "vitest"
import {
  canAccessUserData,
  getUserPermissions,
  hasPermission,
} from "@/lib/roles"

// La BD está mockeada globalmente en __tests__/setup.ts.
// getDb().execute retorna { rows: [] } → getUserRole devuelve 'user' por defecto.

// ─── canAccessUserData ────────────────────────────────────────────────────────

describe("canAccessUserData", () => {
  it("usuario puede acceder a sus propios datos (mismo userId → retorno inmediato)", async () => {
    // Este caso cortocircuita sin llamar a la BD
    expect(await canAccessUserData(1, 1)).toBe(true)
  })

  it("usuario sin permisos elevados no puede acceder a datos de otro usuario", async () => {
    // getDb mock → rol 'user' → canModifyUserData=false, canViewAllUsers=false → false
    expect(await canAccessUserData(1, 2)).toBe(false)
  })

  it("userId muy distinto también retorna false para rol 'user'", async () => {
    expect(await canAccessUserData(10, 99)).toBe(false)
  })
})

// ─── getUserPermissions ───────────────────────────────────────────────────────

describe("getUserPermissions", () => {
  it("usuario sin rol asignado obtiene todos los permisos en false (rol 'user')", async () => {
    // El mock retorna { rows: [] } → rol por defecto 'user'
    const perms = await getUserPermissions(999)
    expect(perms.canViewAllUsers).toBe(false)
    expect(perms.canModifyUserData).toBe(false)
    expect(perms.canManageSystem).toBe(false)
    expect(perms.canExportAllData).toBe(false)
    expect(perms.canAccessAnalytics).toBe(false)
    expect(perms.canViewAuditLogs).toBe(false)
  })
})

// ─── hasPermission ────────────────────────────────────────────────────────────

describe("hasPermission", () => {
  it("usuario sin rol no tiene canViewAuditLogs", async () => {
    expect(await hasPermission(999, "canViewAuditLogs")).toBe(false)
  })

  it("usuario sin rol no tiene canExportAllData", async () => {
    expect(await hasPermission(999, "canExportAllData")).toBe(false)
  })

  it("usuario sin rol no tiene canManageSystem", async () => {
    expect(await hasPermission(999, "canManageSystem")).toBe(false)
  })
})
