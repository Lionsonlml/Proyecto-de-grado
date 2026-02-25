import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { GEMINI_CONFIG, getGeminiApiKey } from "@/lib/gemini-config"

// Métricas léxicas locales para cruce de datos
function calculateLexicalMetrics(text: string) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.toLowerCase().match(/\b\w+\b/g) || []
  const uniqueWords = new Set(words)
  
  // Longitud media de oración
  const avgSentenceLength = words.length / sentences.length
  
  // Repetición de palabras (índice de diversidad léxica)
  const lexicalDiversity = uniqueWords.size / words.length
  
  // Proporción verbo/sustantivo (aproximación simple)
  const verbs = words.filter(w => w.endsWith('ar') || w.endsWith('er') || w.endsWith('ir') || 
    ['es', 'son', 'está', 'están', 'tiene', 'tienen', 'hace', 'hacen'].includes(w))
  const nouns = words.filter(w => w.endsWith('ción') || w.endsWith('sión') || w.endsWith('dad') || 
    w.endsWith('tad') || w.endsWith('ez') || w.endsWith('ura'))
  const verbNounRatio = nouns.length > 0 ? verbs.length / nouns.length : 0
  
  // Coherencia estructural (longitud de párrafos)
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0)
  const avgParagraphLength = words.length / paragraphs.length
  
  return {
    avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
    lexicalDiversity: Math.round(lexicalDiversity * 100) / 100,
    verbNounRatio: Math.round(verbNounRatio * 100) / 100,
    avgParagraphLength: Math.round(avgParagraphLength * 100) / 100,
    wordCount: words.length,
    sentenceCount: sentences.length,
    uniqueWordCount: uniqueWords.size
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { response, analysisType, context } = await request.json()

    if (!response || !analysisType) {
      return NextResponse.json({ error: "Respuesta y tipo de análisis requeridos" }, { status: 400 })
    }

    const apiKey = getGeminiApiKey()

    // Prompt crítico para evaluación
    const evaluationPrompt = `Actúa como un evaluador crítico independiente. No eres el autor de la respuesta. Analiza si la respuesta es coherente, relevante y libre de errores obvios.

RESPUESTA A EVALUAR:
${response}

TIPO DE ANÁLISIS: ${analysisType}
CONTEXTO: ${context || 'No proporcionado'}

Evalúa la respuesta en los siguientes aspectos (0-100 cada uno):

1. COHERENCIA: ¿La respuesta es lógica y bien estructurada?
2. RELEVANCIA: ¿Responde directamente a la pregunta o necesidad?
3. PRECISIÓN: ¿Los datos y afirmaciones son correctos?
4. UTILIDAD: ¿Ayuda realmente al usuario?
5. CLARIDAD: ¿Es fácil de entender?
6. COMPLETITUD: ¿Cubre todos los aspectos necesarios?

FORMATO DE RESPUESTA REQUERIDO:
Confianza: [PUNTUACIÓN_TOTAL_0-100]
Justificación: [EXPLICACIÓN_DETALLADA_DE_LA_EVALUACIÓN]
Coherencia: [PUNTUACIÓN_0-100]
Relevancia: [PUNTUACIÓN_0-100]
Precisión: [PUNTUACIÓN_0-100]
Utilidad: [PUNTUACIÓN_0-100]
Claridad: [PUNTUACIÓN_0-100]
Completitud: [PUNTUACIÓN_0-100]
Errores_detectados: [LISTA_DE_ERRORES_O_PROBLEMAS]
Sugerencias: [MEJORAS_RECOMENDADAS]`

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${GEMINI_CONFIG.model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: evaluationPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error("❌ Error de Gemini API:", errorText)
      throw new Error(`Gemini API error: ${geminiResponse.status}`)
    }

    const geminiData = await geminiResponse.json()
    const evaluationText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Error al obtener respuesta de Gemini"

    // Calcular métricas léxicas locales
    const lexicalMetrics = calculateLexicalMetrics(response)

    // Parsear la respuesta de evaluación
    const confidenceMatch = evaluationText.match(/Confianza:\s*(\d+)/)
    const justificationMatch = evaluationText.match(/Justificación:\s*([^\n]+)/)
    const coherenceMatch = evaluationText.match(/Coherencia:\s*(\d+)/)
    const relevanceMatch = evaluationText.match(/Relevancia:\s*(\d+)/)
    const precisionMatch = evaluationText.match(/Precisión:\s*(\d+)/)
    const utilityMatch = evaluationText.match(/Utilidad:\s*(\d+)/)
    const clarityMatch = evaluationText.match(/Claridad:\s*(\d+)/)
    const completenessMatch = evaluationText.match(/Completitud:\s*(\d+)/)
    const errorsMatch = evaluationText.match(/Errores_detectados:\s*([^\n]+)/)
    const suggestionsMatch = evaluationText.match(/Sugerencias:\s*([^\n]+)/)

    const evaluation = {
      confidence: confidenceMatch ? parseInt(confidenceMatch[1]) : 0,
      justification: justificationMatch ? justificationMatch[1].trim() : "No se pudo evaluar",
      scores: {
        coherence: coherenceMatch ? parseInt(coherenceMatch[1]) : 0,
        relevance: relevanceMatch ? parseInt(relevanceMatch[1]) : 0,
        precision: precisionMatch ? parseInt(precisionMatch[1]) : 0,
        utility: utilityMatch ? parseInt(utilityMatch[1]) : 0,
        clarity: clarityMatch ? parseInt(clarityMatch[1]) : 0,
        completeness: completenessMatch ? parseInt(completenessMatch[1]) : 0,
      },
      errors: errorsMatch ? errorsMatch[1].trim() : "Ninguno detectado",
      suggestions: suggestionsMatch ? suggestionsMatch[1].trim() : "Ninguna sugerencia",
      lexicalMetrics,
      // Puntuación combinada (70% IA + 30% métricas léxicas)
      combinedScore: Math.round(
        (confidenceMatch ? parseInt(confidenceMatch[1]) : 0) * 0.7 + 
        (lexicalMetrics.lexicalDiversity * 100) * 0.3
      ),
      timestamp: new Date().toISOString(),
      analysisType,
      responseLength: response.length
    }

    return NextResponse.json({ 
      success: true, 
      evaluation,
      rawEvaluation: evaluationText
    })

  } catch (error) {
    console.error("Error evaluando respuesta:", error)
    return NextResponse.json({ 
      error: "Error evaluando la respuesta",
      details: error instanceof Error ? error.message : "Error desconocido"
    }, { status: 500 })
  }
}
