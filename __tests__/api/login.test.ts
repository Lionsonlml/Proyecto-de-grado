import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock de @/lib/auth para aislar el handler del login
vi.mock("@/lib/auth", () => ({
  getUserByEmail: vi.fn(),
  verifyPassword: vi.fn(),
  createToken: vi.fn().mockResolvedValue("jwt.token.test"),
}))

import { POST } from "@/app/api/auth/login/route"
import { getUserByEmail, verifyPassword } from "@/lib/auth"

const mockGetUser = vi.mocked(getUserByEmail)
const mockVerify = vi.mocked(verifyPassword)

function makeRequest(body: object) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("400 si falta email", async () => {
    const res = await POST(makeRequest({ password: "abc123" }))
    expect(res.status).toBe(400)
  })

  it("400 si falta password", async () => {
    const res = await POST(makeRequest({ email: "test@test.com" }))
    expect(res.status).toBe(400)
  })

  it("401 si usuario no existe", async () => {
    mockGetUser.mockResolvedValueOnce(undefined)
    const res = await POST(makeRequest({ email: "nadie@test.com", password: "pass" }))
    expect(res.status).toBe(401)
  })

  it("401 si password incorrecta", async () => {
    mockGetUser.mockResolvedValueOnce({
      id: 1,
      email: "user@test.com",
      name: "Test",
      password: "hashed",
    })
    mockVerify.mockResolvedValueOnce(false)
    const res = await POST(makeRequest({ email: "user@test.com", password: "wrong" }))
    expect(res.status).toBe(401)
  })

  it("200 + { success: true, user } en login exitoso", async () => {
    mockGetUser.mockResolvedValueOnce({
      id: 42,
      email: "user@test.com",
      name: "Test User",
      password: "hashed",
    })
    mockVerify.mockResolvedValueOnce(true)

    const res = await POST(makeRequest({ email: "user@test.com", password: "correct" }))
    expect(res.status).toBe(200)

    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.user.id).toBe(42)
    expect(data.user.email).toBe("user@test.com")
  })

  it("cookie auth-token presente en respuesta exitosa", async () => {
    mockGetUser.mockResolvedValueOnce({
      id: 42,
      email: "user@test.com",
      name: "Test User",
      password: "hashed",
    })
    mockVerify.mockResolvedValueOnce(true)

    const res = await POST(makeRequest({ email: "user@test.com", password: "correct" }))
    const setCookie = res.headers.get("set-cookie") ?? ""
    expect(setCookie).toContain("auth-token")
  })
})
