import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
  readAuthToken: vi.fn(),
}))

vi.mock("@/lib/secure-data", () => ({
  getSecureUserMoods: vi.fn().mockResolvedValue([]),
  saveSecureMood: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/utils", () => ({
  getCurrentDateTime: vi.fn().mockReturnValue({ date: "2025-02-25", hour: 10 }),
}))

import { GET, POST } from "@/app/api/moods/route"
import { verifyToken, readAuthToken } from "@/lib/auth"

const mockVerifyToken = vi.mocked(verifyToken)
const mockReadAuthToken = vi.mocked(readAuthToken)

function makeRequest(method: string, body?: object) {
  return new Request("http://localhost/api/moods", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as any
}

describe("GET /api/moods", () => {
  beforeEach(() => vi.clearAllMocks())

  it("401 cuando readAuthToken retorna null (sin token)", async () => {
    mockReadAuthToken.mockReturnValueOnce(null)
    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(401)
  })

  it("401 con token inválido (verifyToken retorna null)", async () => {
    mockReadAuthToken.mockReturnValueOnce("invalid.token")
    mockVerifyToken.mockResolvedValueOnce(null)
    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(401)
  })

  it("200 con token válido — retorna { success: true, moods: [] }", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.moods)).toBe(true)
  })
})

describe("POST /api/moods", () => {
  beforeEach(() => vi.clearAllMocks())

  it("401 sin token de autenticación", async () => {
    mockReadAuthToken.mockReturnValueOnce(null)
    const res = await POST(makeRequest("POST", { energy: 4, type: "optimista" }))
    expect(res.status).toBe(401)
  })

  it("400 si falta energy", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { type: "optimista" }))
    expect(res.status).toBe(400)
  })

  it("400 si falta type", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { energy: 3 }))
    expect(res.status).toBe(400)
  })

  it("400 si energy supera el rango permitido (> 5)", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { energy: 6, type: "optimista" }))
    expect(res.status).toBe(400)
  })

  it("400 si energy es menor al rango permitido (< 1)", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { energy: 0, type: "cansado" }))
    expect(res.status).toBe(400)
  })

  it("200 al crear mood con los campos mínimos requeridos", async () => {
    mockReadAuthToken.mockReturnValueOnce("valid.token")
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { energy: 4, type: "optimista" }))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
