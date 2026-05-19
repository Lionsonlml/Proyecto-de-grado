import { describe, it, expect, vi, beforeEach } from "vitest"

// Mockear @/lib/auth antes de importar la ruta
vi.mock("@/lib/auth", () => ({
  getUserByEmail: vi.fn(),
  createUser: vi.fn().mockResolvedValue(1),
  hashPassword: vi.fn().mockResolvedValue("hashed_password"),
  createToken: vi.fn().mockResolvedValue("jwt.token.test"),
}))

import { POST } from "@/app/api/auth/register/route"
import { getUserByEmail } from "@/lib/auth"

const mockGetUser = vi.mocked(getUserByEmail)

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── Validación de campos requeridos ──────────────────────────────────────

  it("400 si falta email", async () => {
    const res = await POST(makeRequest({ password: "pass123", name: "Test" }))
    expect(res.status).toBe(400)
  })

  it("400 si falta password", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", name: "Test" }))
    expect(res.status).toBe(400)
  })

  it("400 si falta name", async () => {
    const res = await POST(makeRequest({ email: "test@test.com", password: "pass123" }))
    expect(res.status).toBe(400)
  })

  // ── Validación de formato ────────────────────────────────────────────────

  it("400 si el email tiene formato inválido", async () => {
    const res = await POST(
      makeRequest({ email: "no-es-un-email", password: "pass123", name: "Test" })
    )
    expect(res.status).toBe(400)
  })

  it("400 si la contraseña tiene menos de 6 caracteres", async () => {
    const res = await POST(makeRequest({ email: "a@b.com", password: "123", name: "Test" }))
    expect(res.status).toBe(400)
  })

  // ── Conflicto de email duplicado ─────────────────────────────────────────

  it("409 si el email ya está registrado", async () => {
    mockGetUser.mockResolvedValueOnce({
      id: 99,
      email: "existe@test.com",
      name: "Existente",
      password: "hash",
    })
    const res = await POST(
      makeRequest({ email: "existe@test.com", password: "password123", name: "Test" })
    )
    expect(res.status).toBe(409)
  })

  // ── Registro exitoso ─────────────────────────────────────────────────────

  it("200 + { success: true, token, user } en registro exitoso", async () => {
    mockGetUser.mockResolvedValueOnce(undefined)
    const res = await POST(
      makeRequest({ email: "nuevo@test.com", password: "password123", name: "Nuevo Usuario" })
    )
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.token).toBe("jwt.token.test")
    expect(data.user.email).toBe("nuevo@test.com")
    expect(data.user.name).toBe("Nuevo Usuario")
  })

  it("cookie auth-token presente en respuesta exitosa", async () => {
    mockGetUser.mockResolvedValueOnce(undefined)
    const res = await POST(
      makeRequest({ email: "nuevo2@test.com", password: "password123", name: "Test" })
    )
    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("auth-token")
  })
})
