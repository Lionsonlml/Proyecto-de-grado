import { describe, it, expect } from "vitest"
import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  hashToken,
  readAuthToken,
} from "@/lib/auth"

// bcrypt usa 10 rounds → ~100ms por operación. Timeout extendido para esas pruebas.

// ─── hashPassword / verifyPassword ───────────────────────────────────────────

describe("hashPassword / verifyPassword", () => {
  it("el hash generado es diferente al password original", async () => {
    const hash = await hashPassword("miPassword123")
    expect(hash).not.toBe("miPassword123")
  }, 15000)

  it("verifyPassword retorna true para el password correcto", async () => {
    const hash = await hashPassword("correct-pass")
    expect(await verifyPassword("correct-pass", hash)).toBe(true)
  }, 15000)

  it("verifyPassword retorna false para password incorrecto", async () => {
    const hash = await hashPassword("correct-pass")
    expect(await verifyPassword("wrong-pass", hash)).toBe(false)
  }, 15000)

  it("hashes distintos para el mismo password (salt aleatorio)", async () => {
    const hash1 = await hashPassword("misma-clave")
    const hash2 = await hashPassword("misma-clave")
    expect(hash1).not.toBe(hash2)
  }, 15000)
})

// ─── createToken / verifyToken ────────────────────────────────────────────────

describe("createToken / verifyToken", () => {
  const payload = { id: 42, email: "test@test.com", name: "Usuario Test" }

  it("roundtrip: verifyToken devuelve el payload original", async () => {
    const token = await createToken(payload)
    const decoded = await verifyToken(token)
    expect(decoded?.id).toBe(payload.id)
    expect(decoded?.email).toBe(payload.email)
    expect(decoded?.name).toBe(payload.name)
  })

  it("verifyToken retorna null para token inválido", async () => {
    expect(await verifyToken("token.invalido.xyz")).toBeNull()
  })

  it("verifyToken retorna null para cadena vacía", async () => {
    expect(await verifyToken("")).toBeNull()
  })

  it("createToken genera un string con formato JWT (tres partes separadas por '.')", async () => {
    const token = await createToken(payload)
    expect(token.split(".")).toHaveLength(3)
  })
})

// ─── hashToken ───────────────────────────────────────────────────────────────

describe("hashToken", () => {
  it("devuelve string de 64 caracteres (SHA-256 hex)", () => {
    expect(hashToken("my-token-value")).toHaveLength(64)
  })

  it("mismo input siempre produce el mismo hash (determinístico)", () => {
    expect(hashToken("test-token-abc")).toBe(hashToken("test-token-abc"))
  })

  it("inputs distintos producen hashes distintos", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"))
  })

  it("el resultado solo contiene caracteres hexadecimales", () => {
    expect(hashToken("cualquier-token")).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ─── readAuthToken ────────────────────────────────────────────────────────────

describe("readAuthToken", () => {
  /**
   * Crea un mock de NextRequest con cookies y headers controlados.
   * readAuthToken solo accede a request.cookies.get() y request.headers.get(),
   * por lo que no se necesita el objeto NextRequest completo.
   */
  function makeMock({ cookie, authHeader }: { cookie?: string; authHeader?: string }) {
    return {
      cookies: {
        get: (name: string) =>
          cookie && name === "auth-token" ? { value: cookie } : undefined,
      },
      headers: {
        get: (name: string) =>
          authHeader && name === "authorization" ? authHeader : null,
      },
    } as any
  }

  it("lee el token de la cookie auth-token", () => {
    expect(readAuthToken(makeMock({ cookie: "my.jwt.token" }))).toBe("my.jwt.token")
  })

  it("lee el token del header Authorization: Bearer", () => {
    expect(readAuthToken(makeMock({ authHeader: "Bearer header.jwt.token" }))).toBe(
      "header.jwt.token"
    )
  })

  it("retorna null cuando no hay cookie ni header", () => {
    expect(readAuthToken(makeMock({}))).toBeNull()
  })

  it("la cookie tiene prioridad sobre el header Authorization", () => {
    const mock = makeMock({ cookie: "cookie.token", authHeader: "Bearer header.token" })
    expect(readAuthToken(mock)).toBe("cookie.token")
  })

  it("ignora header Authorization que no empiece con 'Bearer '", () => {
    const mock = makeMock({ authHeader: "Basic dXNlcjpwYXNz" })
    expect(readAuthToken(mock)).toBeNull()
  })
})
