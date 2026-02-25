"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Brain, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp,
  Zap,
  Loader2,
  BarChart3
} from "lucide-react"

interface EvaluationResult {
  confidence: number
  justification: string
  scores: {
    coherence: number
    relevance: number
    precision: number
    utility: number
    clarity: number
    completeness: number
  }
  combinedScore: number
  analysisType: string
}

interface EvaluationIntegrationProps {
  response?: string
  analysisType?: string
  context?: string
  onEvaluationComplete?: (evaluation: EvaluationResult) => void
}

export function EvaluationIntegration({ 
  response, 
  analysisType = "análisis general", 
  context,
  onEvaluationComplete 
}: EvaluationIntegrationProps) {
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const evaluateResponse = async () => {
    if (!response) return

    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch("/api/gemini/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, analysisType, context }),
      })

      if (!res.ok) throw new Error("Error evaluando respuesta")

      const data = await res.json()
      const evaluationResult = data.evaluation
      
      setEvaluation(evaluationResult)
      
      if (onEvaluationComplete) {
        onEvaluationComplete(evaluationResult)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { level: "Excelente", icon: CheckCircle, color: "text-green-500" }
    if (score >= 80) return { level: "Muy Buena", icon: TrendingUp, color: "text-green-400" }
    if (score >= 70) return { level: "Buena", icon: TrendingUp, color: "text-yellow-500" }
    if (score >= 60) return { level: "Regular", icon: AlertTriangle, color: "text-orange-500" }
    return { level: "Necesita Mejora", icon: AlertTriangle, color: "text-red-500" }
  }

  if (!response) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Evaluación de Respuesta</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Genera una respuesta con IA para evaluar su calidad y coherencia
          </p>
        </CardContent>
      </Card>
    )
  }

  const ConfidenceLevel = evaluation ? getConfidenceLevel(evaluation.confidence) : null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Evaluación de Calidad IA
        </CardTitle>
        <CardDescription>
          Analiza la coherencia y precisión de la respuesta generada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!evaluation ? (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Respuesta a evaluar:</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {response}
              </p>
            </div>
            
            <Button 
              onClick={evaluateResponse}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Evaluar Respuesta
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Puntuación principal */}
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-3">
                <ConfidenceLevel?.icon className={`h-8 w-8 ${ConfidenceLevel?.color}`} />
                <div>
                  <div className={`text-3xl font-bold ${ConfidenceLevel?.color}`}>
                    {evaluation.confidence}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {ConfidenceLevel?.level}
                  </div>
                </div>
              </div>
              
              <Progress 
                value={evaluation.confidence} 
                className="w-full h-3"
              />
              
              <div className="text-xs text-muted-foreground">
                Puntuación combinada: {evaluation.combinedScore}/100
              </div>
            </div>

            {/* Puntuaciones detalladas */}
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(evaluation.scores).map(([key, score]) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="capitalize">
                      {key === 'coherence' && 'Coherencia'}
                      {key === 'relevance' && 'Relevancia'}
                      {key === 'precision' && 'Precisión'}
                      {key === 'utility' && 'Utilidad'}
                      {key === 'clarity' && 'Claridad'}
                      {key === 'completeness' && 'Completitud'}
                    </span>
                    <span className={`font-bold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>

            {/* Justificación */}
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="font-semibold text-sm mb-1">Justificación:</h4>
              <p className="text-xs text-muted-foreground">{evaluation.justification}</p>
            </div>

            {/* Botón para nueva evaluación */}
            <Button 
              variant="outline" 
              onClick={() => setEvaluation(null)}
              className="w-full"
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Evaluar Otra Respuesta
            </Button>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
