// Configuración de Gemini AI (solo para uso en servidor)
export const GEMINI_CONFIG = {
  model: "gemini-2.5-flash",
  apiVersion: "v1",
  generationConfig: {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192, // Aumentado para permitir respuestas más largas
  },
} as const

// Solo disponible en el servidor
export function getGeminiApiKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("getGeminiApiKey solo puede ser llamada en el servidor")
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no está configurada. Por favor agrégala en la sección Vars de la barra lateral.")
  }
  return apiKey
}
