import { describe, it, expect } from "vitest"
import { buildCacheKey, getCached, setCached, logFallback } from "@/lib/ai-cache"

// La BD está mockeada globalmente en __tests__/setup.ts:
// getDb().execute siempre resuelve con { rows: [] }

// ─── buildCacheKey ────────────────────────────────────────────────────────────

describe("buildCacheKey", () => {
  it("genera clave con formato '{tipo}:{subtipo}:{fecha}'", () => {
    expect(buildCacheKey("analyze", "patterns", "2025-02-25")).toBe(
      "analyze:patterns:2025-02-25"
    )
  })

  it("usa la fecha actual cuando no se pasa date", () => {
    const today = new Date().toISOString().split("T")[0]
    expect(buildCacheKey("advice", "task")).toBe(`advice:task:${today}`)
  })

  it("fechas distintas producen claves distintas", () => {
    const k1 = buildCacheKey("analyze", "patterns", "2025-01-01")
    const k2 = buildCacheKey("analyze", "patterns", "2025-01-02")
    expect(k1).not.toBe(k2)
  })

  it("tipos distintos producen claves distintas", () => {
    const k1 = buildCacheKey("analyze", "patterns", "2025-02-25")
    const k2 = buildCacheKey("advice", "patterns", "2025-02-25")
    expect(k1).not.toBe(k2)
  })
})

// ─── getCached ────────────────────────────────────────────────────────────────

describe("getCached", () => {
  it("retorna null cuando la BD no tiene filas (mock vacío)", async () => {
    const result = await getCached(1, "analyze:patterns:2025-02-25")
    expect(result).toBeNull()
  })

  it("nunca lanza excepción (el caché no debe romper el flujo principal)", async () => {
    await expect(getCached(1, "cualquier:clave:2025-02-25")).resolves.not.toThrow()
  })
})

// ─── setCached ────────────────────────────────────────────────────────────────

describe("setCached", () => {
  it("resuelve sin lanzar excepción al guardar respuesta", async () => {
    await expect(
      setCached(1, "analyze:patterns:2025-02-25", "respuesta de prueba")
    ).resolves.not.toThrow()
  })

  it("acepta TTL personalizado sin lanzar excepción", async () => {
    await expect(
      setCached(2, "advice:tips:2025-02-25", "consejos de prueba", 48)
    ).resolves.not.toThrow()
  })
})

// ─── logFallback ──────────────────────────────────────────────────────────────

describe("logFallback", () => {
  it("registra fallback sin lanzar excepción", async () => {
    await expect(
      logFallback(1, "/api/gemini/analyze", "Quota Exceeded (429)", 2)
    ).resolves.not.toThrow()
  })
})
