"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Brain, 
  Target, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3, 
  Zap,
  Star,
  Loader2,
  RefreshCw,
  Award,
  Activity
} from "lucide-react"

interface EvaluationData {
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
  errors: string
  suggestions: string
  lexicalMetrics: {
    avgSentenceLength: number
    lexicalDiversity: number
    verbNounRatio: number
    avgParagraphLength: number
    wordCount: number
    sentenceCount: number
    uniqueWordCount: number
  }
  combinedScore: number
  timestamp: string
  analysisType: string
  responseLength: number
}

interface AIEvaluationProps {
  onEvaluate?: (evaluation: EvaluationData) => void
  realResponses?: {
    patterns?: string
    recommendations?: string
    schedule?: string
  }
}

export function AIEvaluation({ onEvaluate, realResponses }: AIEvaluationProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluationHistory, setEvaluationHistory] = useState<EvaluationData[]>([])
  const [currentEvaluating, setCurrentEvaluating] = useState<string | null>(null)

  const evaluateResponse = async (response: string, analysisType: string, context?: string) => {
    setLoading(true)
    setError(null)
    setCurrentEvaluating(analysisType)
    
    try {
      const res = await fetch("/api/gemini/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, analysisType, context }),
      })

      if (!res.ok) throw new Error("Error evaluando respuesta")

      const data = await res.json()
      const newEvaluation = data.evaluation
      
      setEvaluation(newEvaluation)
      setEvaluationHistory(prev => [newEvaluation, ...prev.slice(0, 9)]) // Mantener últimas 10
      
      if (onEvaluate) {
        onEvaluate(newEvaluation)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido")
    } finally {
      setLoading(false)
      setCurrentEvaluating(null)
    }
  }

  // Evaluar automáticamente las respuestas reales
  const evaluateRealResponses = async () => {
    if (!realResponses) return

    const evaluations = []
    
    if (realResponses.patterns) {
      await evaluateResponse(realResponses.patterns, "análisis de patrones", "Detección automática de horas productivas")
    }
    
    if (realResponses.recommendations) {
      await evaluateResponse(realResponses.recommendations, "recomendaciones personalizadas", "Sugerencias basadas en historial y estado de ánimo")
    }
    
    if (realResponses.schedule) {
      await evaluateResponse(realResponses.schedule, "optimización de horarios", "Reorganización automática de tareas para máxima eficiencia")
    }
  }

  // Función para obtener la primera línea de una respuesta
  const getFirstLine = (response: string) => {
    return response.split('\n')[0].substring(0, 100) + (response.length > 100 ? '...' : '')
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500"
    if (score >= 60) return "text-yellow-500"
    return "text-red-500"
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return "default"
    if (score >= 60) return "secondary"
    return "destructive"
  }

  const getConfidenceLevel = (score: number) => {
    if (score >= 90) return { level: "Excelente", icon: Star, color: "text-green-500" }
    if (score >= 80) return { level: "Muy Buena", icon: CheckCircle, color: "text-green-400" }
    if (score >= 70) return { level: "Buena", icon: TrendingUp, color: "text-yellow-500" }
    if (score >= 60) return { level: "Regular", icon: AlertTriangle, color: "text-orange-500" }
    return { level: "Necesita Mejora", icon: AlertTriangle, color: "text-red-500" }
  }

  const ConfidenceLevel = getConfidenceLevel(evaluation?.confidence || 0)

  return (
    <div className="space-y-6">
      {/* Header con estadísticas generales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Evaluación de Respuestas IA
          </CardTitle>
          <CardDescription>
            Analiza la coherencia, precisión y utilidad de las respuestas de Gemini
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {evaluationHistory.length}
              </div>
              <div className="text-sm text-muted-foreground">Evaluaciones</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {evaluationHistory.length > 0 
                  ? Math.round(evaluationHistory.reduce((acc, e) => acc + e.confidence, 0) / evaluationHistory.length)
                  : 0
                }
              </div>
              <div className="text-sm text-muted-foreground">Promedio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {evaluationHistory.filter(e => e.confidence >= 80).length}
              </div>
              <div className="text-sm text-muted-foreground">Excelentes</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Respuestas disponibles para evaluar */}
      {realResponses && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Respuestas Disponibles para Evaluar
            </CardTitle>
            <CardDescription>
              Estas son las respuestas reales generadas por los módulos de IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {realResponses.patterns && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="font-medium text-sm">Análisis de Patrones</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    "{getFirstLine(realResponses.patterns)}"
                  </p>
                </div>
              )}
              
              {realResponses.recommendations && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium text-sm">Recomendaciones Personalizadas</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    "{getFirstLine(realResponses.recommendations)}"
                  </p>
                </div>
              )}
              
              {realResponses.schedule && (
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="font-medium text-sm">Optimización de Horarios</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    "{getFirstLine(realResponses.schedule)}"
                  </p>
                </div>
              )}
              
              {!realResponses.patterns && !realResponses.recommendations && !realResponses.schedule && (
                <div className="text-center py-4 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay respuestas disponibles para evaluar</p>
                  <p className="text-xs">Genera respuestas en los módulos de análisis primero</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluación actual */}
      {evaluation && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Evaluación Actual
              </CardTitle>
              <Badge variant={getScoreBadgeVariant(evaluation.confidence)}>
                {evaluation.confidence}/100
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Resumen</TabsTrigger>
                <TabsTrigger value="scores">Puntuaciones</TabsTrigger>
                <TabsTrigger value="metrics">Métricas</TabsTrigger>
                <TabsTrigger value="details">Detalles</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Puntuación principal */}
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <ConfidenceLevel.icon className={`h-8 w-8 ${ConfidenceLevel.color}`} />
                    <div>
                      <div className={`text-3xl font-bold ${ConfidenceLevel.color}`}>
                        {evaluation.confidence}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ConfidenceLevel.level}
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={evaluation.confidence} 
                    className="w-full h-3"
                  />
                  
                  <div className="text-sm text-muted-foreground">
                    Puntuación combinada: {evaluation.combinedScore}/100
                  </div>
                </div>

                {/* Justificación */}
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Justificación:</h4>
                  <p className="text-sm">{evaluation.justification}</p>
                </div>
              </TabsContent>

              <TabsContent value="scores" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(evaluation.scores).map(([key, score]) => (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium capitalize">
                          {key === 'coherence' && 'Coherencia'}
                          {key === 'relevance' && 'Relevancia'}
                          {key === 'precision' && 'Precisión'}
                          {key === 'utility' && 'Utilidad'}
                          {key === 'clarity' && 'Claridad'}
                          {key === 'completeness' && 'Completitud'}
                        </span>
                        <span className={`font-bold ${getScoreColor(score)}`}>
                          {score}/100
                        </span>
                      </div>
                      <Progress value={score} className="h-2" />
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="metrics" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Diversidad Léxica</span>
                      <span className="text-sm font-bold">
                        {Math.round(evaluation.lexicalMetrics.lexicalDiversity * 100)}%
                      </span>
                    </div>
                    <Progress value={evaluation.lexicalMetrics.lexicalDiversity * 100} className="h-2" />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Longitud Promedio</span>
                      <span className="text-sm font-bold">
                        {evaluation.lexicalMetrics.avgSentenceLength} palabras
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(evaluation.lexicalMetrics.avgSentenceLength * 2, 100)} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Palabras Únicas</span>
                      <span className="text-sm font-bold">
                        {evaluation.lexicalMetrics.uniqueWordCount}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((evaluation.lexicalMetrics.uniqueWordCount / evaluation.lexicalMetrics.wordCount) * 100, 100)} 
                      className="h-2" 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Proporción V/N</span>
                      <span className="text-sm font-bold">
                        {evaluation.lexicalMetrics.verbNounRatio.toFixed(2)}
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(evaluation.lexicalMetrics.verbNounRatio * 20, 100)} 
                      className="h-2" 
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Tipo de Análisis:</span>
                    <br />
                    <Badge variant="outline">{evaluation.analysisType}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Longitud de Respuesta:</span>
                    <br />
                    {evaluation.responseLength} caracteres
                  </div>
                  <div>
                    <span className="font-medium">Palabras:</span>
                    <br />
                    {evaluation.lexicalMetrics.wordCount}
                  </div>
                  <div>
                    <span className="font-medium">Oraciones:</span>
                    <br />
                    {evaluation.lexicalMetrics.sentenceCount}
                  </div>
                </div>

                {evaluation.errors !== "Ninguno detectado" && (
                  <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-red-700 dark:text-red-300 mb-2">
                      Errores Detectados:
                    </h4>
                    <p className="text-sm text-red-600 dark:text-red-400">{evaluation.errors}</p>
                  </div>
                )}

                {evaluation.suggestions !== "Ninguna sugerencia" && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
                      Sugerencias:
                    </h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{evaluation.suggestions}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Historial de evaluaciones */}
      {evaluationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Historial de Evaluaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {evaluationHistory.slice(0, 5).map((evaluationItem, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium">
                      {evaluationItem.analysisType}
                    </div>
                    <Badge variant={getScoreBadgeVariant(evaluationItem.confidence)}>
                      {evaluationItem.confidence}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(evaluationItem.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Botones de acción */}
      <div className="flex gap-2">
        {realResponses ? (
          <>
            <Button 
              onClick={evaluateRealResponses}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentEvaluating ? `Evaluando ${currentEvaluating}...` : 'Evaluando...'}
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Evaluar Respuestas Reales
                </>
              )}
            </Button>
            
            {evaluation && (
              <Button 
                variant="outline"
                onClick={() => setEvaluation(null)}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Nueva Evaluación
              </Button>
            )}
          </>
        ) : (
          <>
            <Button 
              onClick={() => {
                const sampleResponse = "Basándome en tus patrones de productividad, recomiendo programar las tareas más importantes entre las 8 AM y 10 AM, cuando tu energía y concentración están en su punto máximo. También sugiero tomar descansos de 5 minutos cada 25 minutos para mantener la productividad."
                evaluateResponse(sampleResponse, "análisis de productividad", "Recomendación de horarios")
              }}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluando...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Evaluar Respuesta de Ejemplo
                </>
              )}
            </Button>
            
            {evaluation && (
              <Button 
                variant="outline"
                onClick={() => {
                  const sampleResponse = "Tu horario está optimizado. Continúa así."
                  evaluateResponse(sampleResponse, "optimización de horario", "Respuesta breve")
                }}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Probar Otra
              </Button>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  )
}
