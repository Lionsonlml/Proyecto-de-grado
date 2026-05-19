import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/auth", () => ({
  verifyToken: vi.fn(),
}))

vi.mock("@/lib/secure-data", () => ({
  getSecureUserTasks: vi.fn().mockResolvedValue([]),
  saveSecureTask: vi.fn().mockResolvedValue(undefined),
  updateSecureTask: vi.fn().mockResolvedValue(undefined),
  deleteSecureTask: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from "@/app/api/tasks/route"
import { verifyToken } from "@/lib/auth"

const mockVerifyToken = vi.mocked(verifyToken)

/**
 * El handler de tasks lee cookies con request.cookies.get("auth-token"),
 * propiedad propia de NextRequest. Se inyecta manualmente en el mock.
 */
function makeRequest(method: string, body?: object, authToken?: string) {
  const req = new Request("http://localhost/api/tasks", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as any

  // Simular NextRequest.cookies
  req.cookies = {
    get: (name: string) =>
      authToken && name === "auth-token" ? { value: authToken } : undefined,
  }

  return req
}

describe("GET /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("401 sin cookie de autenticación", async () => {
    const res = await GET(makeRequest("GET"))
    expect(res.status).toBe(401)
  })

  it("401 con token inválido (verifyToken retorna null)", async () => {
    mockVerifyToken.mockResolvedValueOnce(null)
    const res = await GET(makeRequest("GET", undefined, "invalid.token"))
    expect(res.status).toBe(401)
  })

  it("200 con token válido — retorna { success: true, tasks: [] }", async () => {
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await GET(makeRequest("GET", undefined, "valid.token"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(Array.isArray(data.tasks)).toBe(true)
  })
})

describe("POST /api/tasks", () => {
  beforeEach(() => vi.clearAllMocks())

  it("401 sin cookie de autenticación", async () => {
    const res = await POST(makeRequest("POST", { title: "Test" }))
    expect(res.status).toBe(401)
  })

  it("401 con token inválido", async () => {
    mockVerifyToken.mockResolvedValueOnce(null)
    const res = await POST(makeRequest("POST", { title: "Test" }, "invalid.token"))
    expect(res.status).toBe(401)
  })

  it("400 si falta el título de la tarea", async () => {
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { category: "trabajo" }, "valid.token"))
    expect(res.status).toBe(400)
  })

  it("200 al crear tarea con campos mínimos (solo título)", async () => {
    mockVerifyToken.mockResolvedValueOnce({ id: 1, email: "test@test.com", name: "Test" })
    const res = await POST(makeRequest("POST", { title: "Mi tarea importante" }, "valid.token"))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
  })
})
