import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("@/lib/gemini-config", () => ({
  GEMINI_CONFIG: {
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
      topK: 40,
      topP: 0.95,
    },
  },
}))

import { callGeminiWithRetry, GeminiRetryError } from "@/lib/gemini-caller"

// Respuesta JSON válida de Gemini
const successBody = JSON.stringify({
  candidates: [{ content: { parts: [{ text: "Respuesta de prueba" }] } }],
})

function makeResponse(status: number, body = successBody): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("callGeminiWithRetry", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("éxito en el 1er intento retorna { text, attempts: 1 }", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(200))

    const result = await callGeminiWithRetry("prompt", { apiKey: "test-key" })
    expect(result.text).toBe("Respuesta de prueba")
    expect(result.attempts).toBe(1)
  })

  it("429 en 1er intento → éxito en 2do → { text, attempts: 2 }", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(429, "quota exceeded"))
      .mockResolvedValueOnce(makeResponse(200))

    const result = await callGeminiWithRetry("prompt", { apiKey: "test-key" })
    expect(result.text).toBe("Respuesta de prueba")
    expect(result.attempts).toBe(2)
  }, 10000)

  it("429 × 2 lanza GeminiRetryError con reason 'Quota Exceeded (429)'", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(429, "quota"))
      .mockResolvedValueOnce(makeResponse(429, "quota"))

    await expect(
      callGeminiWithRetry("prompt", { apiKey: "test-key" })
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof GeminiRetryError && err.reason === "Quota Exceeded (429)"
    })
  }, 10000)

  it("401 lanza error inmediato sin reintentar", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(makeResponse(401, "unauthorized"))

    await expect(
      callGeminiWithRetry("prompt", { apiKey: "bad-key" })
    ).rejects.toThrow()

    // Solo se llamó 1 vez (sin retry)
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1)
  })

  it("500 × 2 lanza GeminiRetryError con reason 'Server Error (500)'", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(500, "server error"))
      .mockResolvedValueOnce(makeResponse(500, "server error"))

    await expect(
      callGeminiWithRetry("prompt", { apiKey: "test-key" })
    ).rejects.toSatisfy((err: unknown) => {
      return err instanceof GeminiRetryError && err.reason === "Server Error (500)"
    })
  }, 10000)

  it("GeminiRetryError.isRetryExhausted === true", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(makeResponse(429, "quota"))
      .mockResolvedValueOnce(makeResponse(429, "quota"))

    try {
      await callGeminiWithRetry("prompt", { apiKey: "test-key" })
    } catch (err) {
      expect(err instanceof GeminiRetryError).toBe(true)
      expect((err as GeminiRetryError).isRetryExhausted).toBe(true)
    }
  }, 10000)
})
