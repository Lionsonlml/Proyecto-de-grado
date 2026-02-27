// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface LexicalMetrics {
  wordCount: number
  sentenceCount: number
  uniqueWordCount: number
  avgSentenceLength: number
  lexicalDiversity: number
  verbNounRatio: number
  avgParagraphLength: number
}

export interface EvaluationScores {
  coherence: number
  relevance: number
  precision: number
  utility: number
  clarity: number
  completeness: number
}

export interface EvaluationResult {
  confidence: number
  justification: string
  scores: EvaluationScores
  errors: string
  suggestions: string
  lexicalMetrics: LexicalMetrics
  /** Puntuación combinada: 70% IA + 30% diversidad léxica */
  combinedScore: number
  timestamp: string
  analysisType: string
  responseLength: number
}

// ─── Métricas léxicas (local, sin IA) ────────────────────────────────────────

export function calculateLexicalMetrics(text: string): LexicalMetrics {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const uniqueWords = new Set(words)

  const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
  const lexicalDiversity = words.length > 0 ? uniqueWords.size / words.length : 0

  const verbs = words.filter(
    (w) =>
      w.endsWith("ar") ||
      w.endsWith("er") ||
      w.endsWith("ir") ||
      ["es", "son", "está", "están", "tiene", "tienen", "hace", "hacen"].includes(w)
  )
  const nouns = words.filter(
    (w) =>
      w.endsWith("ción") ||
      w.endsWith("sión") ||
      w.endsWith("dad") ||
      w.endsWith("tad") ||
      w.endsWith("ez") ||
      w.endsWith("ura")
  )
  const verbNounRatio = nouns.length > 0 ? verbs.length / nouns.length : 0

  const paragraphs = text.split("\n\n").filter((p) => p.trim().length > 0)
  const avgParagraphLength = paragraphs.length > 0 ? words.length / paragraphs.length : 0

  return {
    wordCount: words.length,
    sentenceCount: sentences.length,
    uniqueWordCount: uniqueWords.size,
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
    verbNounRatio: Math.round(verbNounRatio * 100) / 100,
    avgParagraphLength: Math.round(avgParagraphLength * 100) / 100,
  }
}

// ─── Evaluación degradada (sin IA) ───────────────────────────────────────────
// Se usa si la llamada al evaluador Gemini falla. No interrumpe el pipeline.

function buildDegradedEvaluation(
  text: string,
  analysisType: string
): EvaluationResult {
  const lexicalMetrics = calculateLexicalMetrics(text)
  const lexScore = Math.round(lexicalMetrics.lexicalDiversity * 100)
  return {
    confidence: lexScore,
    justification: "Evaluación automática basada en métricas léxicas (evaluador IA no disponible).",
    scores: {
      coherence: lexScore,
      relevance: 0,
      precision: 0,
      utility: 0,
      clarity: lexScore,
      completeness: 0,
    },
    errors: "Evaluador IA no disponible",
    suggestions: "Ninguna disponible en modo degradado",
    lexicalMetrics,
    combinedScore: lexScore,
    timestamp: new Date().toISOString(),
    analysisType,
    responseLength: text.length,
  }
}

// ─── Evaluación local (sin Gemini) ────────────────────────────────────────────

/**
 * Evalúa una respuesta usando solo métricas léxicas locales.
 * No consume cuota de Gemini — el pipeline principal ya usa el cupo disponible.
 * NUNCA lanza excepción.
 */
export async function evaluateResponse(
  response: string,
  analysisType: string,
  _context?: string
): Promise<EvaluationResult> {
  return buildDegradedEvaluation(response, analysisType)
}
