import { callGeminiWithRetry } from "./gemini-caller"
import { getGeminiApiKey } from "./gemini-config"

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
  clarity: number        // bienestar del usuario
  completeness: number   // completitud de la respuesta
}

export interface EvaluationResult {
  confidence: number
  justification: string
  scores: EvaluationScores
  errors: string
  suggestions: string
  lexicalMetrics: LexicalMetrics
  /** Puntuación combinada: 85% IA + 15% diversidad léxica */
  combinedScore: number
  timestamp: string
  analysisType: string
  responseLength: number
  /** Indica si la evaluación fue realizada por Gemini o por métricas léxicas */
  evaluationMode: "ai" | "lexical"
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

// ─── Limpieza de texto para evaluación ───────────────────────────────────────

function cleanResponseText(text: string): string {
  // Eliminar bloques de código markdown (```json ... ```)
  return text
    .replace(/```[\w]*\n?/g, "")
    .replace(/```/g, "")
    .trim()
}

// ─── Evaluación degradada (sin IA) ───────────────────────────────────────────

function buildDegradedEvaluation(text: string, analysisType: string): EvaluationResult {
  const lexicalMetrics = calculateLexicalMetrics(text)
  const lexScore = Math.round(lexicalMetrics.lexicalDiversity * 100)

  // Métricas léxicas adicionales para puntuación más informativa
  const lengthScore = Math.min(100, Math.round((lexicalMetrics.wordCount / 80) * 100))
  const structureScore = Math.min(100, Math.round(lexicalMetrics.sentenceCount * 12))
  const coherenceEstimate = Math.round((lexScore + structureScore) / 2)

  return {
    confidence: coherenceEstimate,
    justification:
      "Evaluación basada en métricas léxicas automáticas (modo sin conexión a evaluador IA). " +
      `Diversidad léxica: ${Math.round(lexicalMetrics.lexicalDiversity * 100)}%, ` +
      `${lexicalMetrics.wordCount} palabras, ${lexicalMetrics.sentenceCount} oraciones.`,
    scores: {
      coherence: coherenceEstimate,
      relevance: 0,
      precision: 0,
      utility: 0,
      clarity: lexScore,
      completeness: lengthScore,
    },
    errors: "Evaluador IA no disponible — usando análisis léxico local",
    suggestions: "Configura GEMINI_API_KEY para habilitar evaluación completa con IA",
    lexicalMetrics,
    combinedScore: coherenceEstimate,
    timestamp: new Date().toISOString(),
    analysisType,
    responseLength: text.length,
    evaluationMode: "lexical",
  }
}

// ─── Evaluación con Gemini ────────────────────────────────────────────────────

async function evaluateWithGemini(
  text: string,
  analysisType: string
): Promise<EvaluationResult | null> {
  let apiKey: string
  try {
    apiKey = getGeminiApiKey()
  } catch {
    return null
  }

  const cleanText = cleanResponseText(text).substring(0, 2000)

  const prompt = `Analiza la siguiente respuesta generada por un asistente de productividad y bienestar personal. Evalúa cada dimensión de 0 a 100.

TIPO DE ANÁLISIS: ${analysisType}
RESPUESTA A EVALUAR:
---
${cleanText}
---

Responde ÚNICAMENTE con un objeto JSON válido (sin texto antes ni después):
{
  "coherencia": <número 0-100>,
  "relevancia": <número 0-100>,
  "precision": <número 0-100>,
  "utilidad": <número 0-100>,
  "bienestar": <número 0-100, si cuida el estado emocional del usuario>,
  "completitud": <número 0-100>,
  "confianza": <número 0-100, calidad general>,
  "justificacion": "<2 oraciones sobre calidad y adecuación>",
  "errores": "<problemas detectados, o 'Ninguno detectado'>",
  "sugerencias": "<mejoras posibles, o 'La respuesta es satisfactoria'>"
}`

  try {
    const result = await callGeminiWithRetry(
      prompt,
      {
        apiKey,
        temperature: 0.15,
        maxOutputTokens: 600,
        systemInstruction:
          "Eres un evaluador crítico de calidad de IA especializado en bienestar y productividad. " +
          "Tu rol es detectar si las respuestas del asistente son coherentes, relevantes, precisas y beneficiosas para el usuario. " +
          "Respondes SOLO con JSON válido, sin ningún texto adicional.",
      },
      1
    )

    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const s = JSON.parse(jsonMatch[0])
    const clamp = (v: any) => Math.min(100, Math.max(0, Math.round(Number(v) || 0)))

    const coherence = clamp(s.coherencia)
    const relevance = clamp(s.relevancia)
    const precision = clamp(s.precision)
    const utility = clamp(s.utilidad)
    const wellbeing = clamp(s.bienestar)
    const completeness = clamp(s.completitud)
    const confidence = clamp(s.confianza)

    const lexicalMetrics = calculateLexicalMetrics(text)
    const lexScore = Math.round(lexicalMetrics.lexicalDiversity * 100)
    const aiAvg = Math.round((coherence + relevance + precision + utility + wellbeing) / 5)
    const combinedScore = Math.round(aiAvg * 0.85 + lexScore * 0.15)

    return {
      confidence: combinedScore,
      justification: String(s.justificacion || "Evaluación completada con IA."),
      scores: {
        coherence,
        relevance,
        precision,
        utility,
        clarity: wellbeing,
        completeness,
      },
      errors: String(s.errores || "Ninguno detectado"),
      suggestions: String(s.sugerencias || "La respuesta es satisfactoria"),
      lexicalMetrics,
      combinedScore,
      timestamp: new Date().toISOString(),
      analysisType,
      responseLength: text.length,
      evaluationMode: "ai",
    }
  } catch (err) {
    console.error("[ai-evaluator] Gemini evaluation failed, using fallback:", err)
    return null
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Evalúa una respuesta IA.
 * Intenta usar Gemini primero; si falla, usa métricas léxicas locales.
 * NUNCA lanza excepción.
 */
export async function evaluateResponse(
  response: string,
  analysisType: string,
  _context?: string
): Promise<EvaluationResult> {
  try {
    const geminiResult = await evaluateWithGemini(response, analysisType)
    if (geminiResult) return geminiResult
  } catch {
    // Silenciar errores inesperados y caer al fallback
  }
  return buildDegradedEvaluation(response, analysisType)
}
