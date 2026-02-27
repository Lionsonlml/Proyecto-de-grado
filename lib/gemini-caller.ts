import { GEMINI_CONFIG } from "./gemini-config"

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface GeminiCallConfig {
  apiKey: string
  temperature?: number
  maxOutputTokens?: number
  systemInstruction?: string // Coach Conductual / Evaluador Crítico
}

export interface GeminiResult {
  text: string
  attempts: number
}

export class GeminiRetryError extends Error {
  public readonly attempts: number
  public readonly reason: string
  public readonly isRetryExhausted = true

  constructor(message: string, attempts: number, reason: string) {
    super(message)
    this.name = "GeminiRetryError"
    this.attempts = attempts
    this.reason = reason
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RETRY_DELAY_MS = 1500
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504])

// ─── Llamada con reintentos ───────────────────────────────────────────────────
/**
 * Llama a la API de Gemini con 1 reintento automático ante errores 429/5xx.
 * Solo activa el fallback si AMBOS intentos fallan.
 */
export async function callGeminiWithRetry(
  prompt: string,
  config: GeminiCallConfig,
  maxRetries = 1
): Promise<GeminiResult> {
  let lastError: Error | null = null
  let lastStatus = 0

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    if (attempt > 1) {
      // Esperar antes del reintento (anti-burst para cuota 429)
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt))
    }

    try {
      const body: Record<string, unknown> = {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? GEMINI_CONFIG.generationConfig.temperature,
          maxOutputTokens: config.maxOutputTokens ?? GEMINI_CONFIG.generationConfig.maxOutputTokens,
          topK: GEMINI_CONFIG.generationConfig.topK,
          topP: GEMINI_CONFIG.generationConfig.topP,
        },
      }

      // System instruction (rol Coach Conductual o Evaluador Crítico)
      if (config.systemInstruction) {
        body.systemInstruction = { parts: [{ text: config.systemInstruction }] }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_CONFIG.model}:generateContent?key=${config.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      )

      lastStatus = response.status

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        console.error(`[Gemini] HTTP ${response.status} (intento ${attempt}):`, errorBody.substring(0, 400))
        const error = new Error(`Gemini HTTP ${response.status}`)
        ;(error as any).status = response.status
        ;(error as any).body = errorBody

        if (RETRYABLE_STATUSES.has(response.status)) {
          lastError = error
          continue // reintentar
        }
        throw error // error no retriable (401, 400, etc.)
      }

      const data = await response.json()

      if (data.promptFeedback?.blockReason) {
        throw new Error(`Safety filter: ${data.promptFeedback.blockReason}`)
      }

      const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
      if (!text) {
        const reason = data.candidates?.[0]?.finishReason ?? "UNKNOWN"
        throw new Error(`Respuesta vacía (finishReason: ${reason})`)
      }

      return { text, attempts: attempt }
    } catch (err) {
      const status = (err as any).status ?? 0
      lastError = err as Error
      lastStatus = status || lastStatus

      if (RETRYABLE_STATUSES.has(status)) continue
      throw err // error no retriable
    }
  }

  // Ambos intentos fallaron → lanzar GeminiRetryError para activar fallback
  const reason =
    lastStatus === 429
      ? "Quota Exceeded (429)"
      : lastStatus >= 500
      ? `Server Error (${lastStatus})`
      : lastError?.message ?? "Network Error"

  throw new GeminiRetryError(
    `Gemini no disponible tras ${maxRetries + 1} intentos: ${reason}`,
    maxRetries + 1,
    reason
  )
}
