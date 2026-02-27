import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock de callGeminiWithRetry antes de importar ai-evaluator
vi.mock("@/lib/gemini-caller", () => ({
  callGeminiWithRetry: vi.fn(),
  GeminiRetryError: class GeminiRetryError extends Error {
    attempts: number
    reason: string
    isRetryExhausted = true
    constructor(msg: string, attempts: number, reason: string) {
      super(msg)
      this.attempts = attempts
      this.reason = reason
    }
  },
}))

vi.mock("@/lib/gemini-config", () => ({
  getGeminiApiKey: vi.fn(() => "test-key"),
}))

import { evaluateResponse } from "@/lib/ai-evaluator"
import { callGeminiWithRetry } from "@/lib/gemini-caller"

const mockCall = vi.mocked(callGeminiWithRetry)

describe("evaluateResponse (modo degradado — Gemini falla)", () => {
  beforeEach(() => {
    mockCall.mockRejectedValue(new Error("Gemini no disponible"))
  })

  it("no lanza excepción cuando Gemini falla", async () => {
    await expect(evaluateResponse("Texto de prueba", "analyze")).resolves.not.toThrow()
  })

  it("retorna EvaluationResult con todos los campos requeridos", async () => {
    const result = await evaluateResponse("Texto de prueba con varias palabras", "advice")
    expect(result).toHaveProperty("confidence")
    expect(result).toHaveProperty("justification")
    expect(result).toHaveProperty("scores")
    expect(result).toHaveProperty("lexicalMetrics")
    expect(result).toHaveProperty("combinedScore")
    expect(result).toHaveProperty("timestamp")
    expect(result).toHaveProperty("analysisType")
    expect(result).toHaveProperty("responseLength")
  })

  it("combinedScore está entre 0 y 100", async () => {
    const result = await evaluateResponse("Evaluación de productividad personal", "patterns")
    expect(result.combinedScore).toBeGreaterThanOrEqual(0)
    expect(result.combinedScore).toBeLessThanOrEqual(100)
  })

  it("lexicalMetrics.wordCount > 0 para texto con palabras", async () => {
    const result = await evaluateResponse("La productividad personal mejora con la planificación diaria", "analyze")
    expect(result.lexicalMetrics.wordCount).toBeGreaterThan(0)
  })

  it("justification menciona métricas léxicas en modo degradado", async () => {
    const result = await evaluateResponse("Texto de prueba", "evaluate")
    expect(result.justification.toLowerCase()).toMatch(/métricas léxicas|evaluación automática/)
  })
})
