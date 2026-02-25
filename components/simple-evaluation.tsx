"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Target, Loader2, Activity, Clock } from "lucide-react"

interface SimpleEvaluationProps {
  lastResponse?: {
    text: string
    type: string
    timestamp: string
  }
}

export function SimpleEvaluation({ lastResponse }: SimpleEvaluationProps) {
  const [evaluation, setEvaluation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (lastResponse?.text) {
      evaluateResponse(lastResponse.text, lastResponse.type)
    }
  }, [lastResponse])

  const evaluateResponse = async (response: string, analysisType: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/gemini/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          response, 
          analysisType, 
          context: `Evaluación automática de respuesta de ${analysisType}` 
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

  const getFirstLine = (response: string) => {
    return response.split('\n')[0].substring(0, 80) + (response.length > 80 ? '...' : '')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-600" />
            Evaluación Automática de Respuestas IA
          </CardTitle>
          <CardDescription>
            Análisis automático de la calidad y coherencia de las respuestas generadas
          </CardDescription>
        </CardHeader>
      </Card>

      {!lastResponse && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Esperando Respuesta</h3>
            <p className="text-sm text-muted-foreground">
              Genera una respuesta con IA para ver su evaluación automática
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
                <p className="text-sm">
                  "{getFirstLine(lastResponse.text)}"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Evaluando Respuesta</h3>
            <p className="text-sm text-muted-foreground">
              Analizando coherencia, precisión y utilidad...
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
              <Badge variant={evaluation.confidence >= 80 ? "default" : evaluation.confidence >= 60 ? "secondary" : "destructive"}>
                {evaluation.confidence}/100
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <Target className="h-8 w-8 text-green-500" />
                <div>
                  <div className="text-3xl font-bold text-green-500">
                    {evaluation.confidence}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {evaluation.confidence >= 90 ? "Excelente" : 
                     evaluation.confidence >= 80 ? "Muy Buena" : 
                     evaluation.confidence >= 70 ? "Buena" : 
                     evaluation.confidence >= 60 ? "Regular" : "Necesita Mejora"}
                  </div>
                </div>
              </div>
              
              <Progress 
                value={evaluation.confidence} 
                className="w-full h-3"
              />
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-semibold text-sm mb-2">Resumen de Evaluación:</h4>
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  {evaluation.justification}
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-3">Puntuaciones Detalladas:</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Coherencia</span>
                      <span className="font-bold">{evaluation.scores.coherence}</span>
                    </div>
                    <Progress value={evaluation.scores.coherence} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Relevancia</span>
                      <span className="font-bold">{evaluation.scores.relevance}</span>
                    </div>
                    <Progress value={evaluation.scores.relevance} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Precisión</span>
                      <span className="font-bold">{evaluation.scores.precision}</span>
                    </div>
                    <Progress value={evaluation.scores.precision} className="h-2" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span>Utilidad</span>
                      <span className="font-bold">{evaluation.scores.utility}</span>
                    </div>
                    <Progress value={evaluation.scores.utility} className="h-2" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Puntuación Combinada:</span>
                  <br />
                  <span className="text-lg font-bold text-blue-600">{evaluation.combinedScore}/100</span>
                </div>
                <div>
                  <span className="font-medium">Diversidad Léxica:</span>
                  <br />
                  <span className="text-lg font-bold text-green-600">
                    {Math.round(evaluation.lexicalMetrics.lexicalDiversity * 100)}%
                  </span>
                </div>
              </div>

              {evaluation.errors !== "Ninguno detectado" && (
                <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
                  <h4 className="font-semibold text-red-700 dark:text-red-300 mb-1 text-sm">
                    Errores Detectados:
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-400">{evaluation.errors}</p>
                </div>
              )}

              {evaluation.suggestions !== "Ninguna sugerencia" && (
                <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                  <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-1 text-sm">
                    Sugerencias de Mejora:
                  </h4>
                  <p className="text-xs text-blue-600 dark:text-blue-400">{evaluation.suggestions}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <Target className="h-4 w-4" />
              <span className="font-medium">Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}