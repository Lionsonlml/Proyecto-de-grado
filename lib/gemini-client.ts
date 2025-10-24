// Cliente para llamar a las API routes de Gemini desde el frontend

export interface GeminiAnalysisRequest {
  tasks: any[]
  moods: any[]
  analysisType?: "patterns" | "schedule"
}

export interface GeminiAnalysisResponse {
  success: boolean
  prompt: string
  response: string
  rawData: any
  timestamp: string
  error?: string
}

export interface GeminiInsightRequest {
  context: any
  question: string
}

export interface GeminiInsightResponse {
  success: boolean
  insight: string
  confidence: number
  timestamp: string
  error?: string
}

export async function analyzeWithGemini(request: GeminiAnalysisRequest): Promise<GeminiAnalysisResponse> {
  const response = await fetch("/api/gemini/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al analizar con Gemini")
  }

  return response.json()
}

export async function getGeminiInsight(request: GeminiInsightRequest): Promise<GeminiInsightResponse> {
  const response = await fetch("/api/gemini/insight", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || "Error al obtener insight")
  }

  return response.json()
}
