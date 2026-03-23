"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Loader2, Activity, Clock, Brain, CheckCircle, AlertCircle } from "lucide-react"

interface SimpleEvaluationProps {
  lastResponse?: {
    text: string
    type: string
    timestamp: string
  }
}

function cleanPreviewText(text: string): string {
  return text
    .replace(/```[\w]*\n?/g, "")
    .replace(/```/g, "")
    .replace(/^\s*[\{\[]/m, "")    // quitar JSON crudo al inicio
    .trim()
}

export function SimpleEvaluation({ lastResponse }: SimpleEvaluationProps) {
  const [evaluation, setEvaluation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lastResponse?.text) {
      runEvaluation(lastResponse.text, lastResponse.type)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResponse?.text, lastResponse?.type])

  const runEvaluation = async (response: string, analysisType: string) => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/gemini/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response,
          analysisType,
          context: `Evaluación automática de respuesta de ${analysisType}`,
        }),
      })

      if (!res.ok) throw new Error("Error evaluando respuesta")

      const data = await res.json()
      setEvaluation(data.evaluation)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getPreview = (text: string) => {
    const clean = cleanPreviewText(text)
    const firstLine = clean.split("\n").find((l) => l.trim().length > 10) || clean
    return firstLine.substring(0, 100) + (clean.length > 100 ? "..." : "")
  }

  const scoreColor = (score: number) =>
    score >= 80 ? "text-green-600 dark:text-green-400" :
    score >= 60 ? "text-yellow-600 dark:text-yellow-400" :
    "text-red-600 dark:text-red-400"

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Evaluación Automática de Respuestas IA
          </CardTitle>
          <CardDescription>
            Sistema de control de calidad: verifica coherencia, relevancia, precisión y bienestar del usuario
          </CardDescription>
        </CardHeader>
      </Card>

      {!lastResponse && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Esperando Respuesta</h3>
            <p className="text-sm text-muted-foreground">
              Genera una respuesta con IA para ver su evaluación automática de calidad
            </p>
          </CardContent>
        </Card>
      )}

      {lastResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4 text-blue-500" />
              Última Respuesta Generada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="capitalize">
                  {lastResponse.type}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastResponse.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm italic">"{getPreview(lastResponse.text)}"</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Evaluando con IA</h3>
            <p className="text-sm text-muted-foreground">
              Analizando coherencia, relevancia, precisión y bienestar...
            </p>
          </CardContent>
        </Card>
      )}

      {evaluation && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                Resultado de Evaluación
              </div>
              <div className="flex items-center gap-2">
                {evaluation.evaluationMode === "ai" ? (
                  <Badge variant="default" className="gap-1 text-xs">
                    <Brain className="h-3 w-3" />
                    Evaluado con IA
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1 text-xs">
                    <Activity className="h-3 w-3" />
                    Análisis léxico
                  </Badge>
                )}
                <Badge
                  variant={
                    evaluation.combinedScore >= 80
                      ? "default"
                      : evaluation.combinedScore >= 60
                      ? "secondary"
                      : "destructive"
                  }
                >
                  {evaluation.combinedScore}/100
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Puntuación principal */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3">
                <div className={`text-4xl font-bold ${scoreColor(evaluation.combinedScore)}`}>
                  {evaluation.combinedScore}
                </div>
                <div className="text-left">
                  <div className={`text-sm font-semibold ${scoreColor(evaluation.combinedScore)}`}>
                    {evaluation.combinedScore >= 90
                      ? "Excelente"
                      : evaluation.combinedScore >= 80
                      ? "Muy Buena"
                      : evaluation.combinedScore >= 70
                      ? "Buena"
                      : evaluation.combinedScore >= 60
                      ? "Regular"
                      : "Necesita Mejora"}
                  </div>
                  <div className="text-xs text-muted-foreground">Puntuación combinada</div>
                </div>
              </div>
              <Progress value={evaluation.combinedScore} className="w-full h-3" />
            </div>

            {/* Justificación */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">{evaluation.justification}</p>
            </div>

            {/* Puntuaciones detalladas */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Puntuaciones Detalladas:</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Coherencia", value: evaluation.scores.coherence },
                  { label: "Relevancia", value: evaluation.scores.relevance },
                  { label: "Precisión", value: evaluation.scores.precision },
                  { label: "Utilidad", value: evaluation.scores.utility },
                  { label: "Bienestar", value: evaluation.scores.clarity },
                  { label: "Completitud", value: evaluation.scores.completeness },
                ].map(({ label, value }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>{label}</span>
                      <span className={`font-bold ${scoreColor(value)}`}>{value}</span>
                    </div>
                    <Progress value={value} className="h-2" />
                  </div>
                ))}
              </div>
            </div>

            {/* Métricas léxicas */}
            <div className="grid grid-cols-2 gap-4 text-sm border-t pt-3">
              <div>
                <span className="text-muted-foreground">Diversidad léxica</span>
                <div className="text-lg font-bold text-primary">
                  {Math.round(evaluation.lexicalMetrics.lexicalDiversity * 100)}%
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Palabras únicas</span>
                <div className="text-lg font-bold text-primary">
                  {evaluation.lexicalMetrics.uniqueWordCount}/{evaluation.lexicalMetrics.wordCount}
                </div>
              </div>
            </div>

            {/* Errores */}
            {evaluation.errors !== "Ninguno detectado" && (
              <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <h4 className="font-semibold text-red-700 dark:text-red-300 text-sm">
                    Problemas detectados:
                  </h4>
                </div>
                <p className="text-xs text-red-600 dark:text-red-400">{evaluation.errors}</p>
              </div>
            )}

            {/* Sugerencias */}
            {evaluation.suggestions !== "La respuesta es satisfactoria" && evaluation.suggestions !== "Ninguna sugerencia" && (
              <div className="bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-sm">
                    Sugerencias de mejora:
                  </h4>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-400">{evaluation.suggestions}</p>
              </div>
            )}

            {evaluation.errors === "Ninguno detectado" && (
              <div className="bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    Respuesta sin problemas detectados
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Error de evaluación:</span>
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
