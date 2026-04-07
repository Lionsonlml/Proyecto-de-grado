"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { GeminiDemo } from "@/components/gemini-demo"
import { PatternAnalysis } from "@/components/pattern-analysis"
import { Recommendations } from "@/components/recommendations"
import { ScheduleOptimizer } from "@/components/schedule-optimizer"
import { InsightsHistory } from "@/components/insights-history"
import { SimpleEvaluation } from "@/components/simple-evaluation"
import { Brain, Sparkles, History, Loader2, CheckCircle2, XCircle, Wrench, BarChart2, RefreshCw } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

export default function GeminiLabPage() {
  const [lastResponse, setLastResponse] = useState<{
    text: string
    type: string
    timestamp: string
  } | undefined>()
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageData, setUsageData] = useState<any>(null)
  const [patternInitial, setPatternInitial] = useState<{ result: string; generatedAt: string } | null>(null)
  const [recommendationsInitial, setRecommendationsInitial] = useState<{ result: string; generatedAt: string } | null>(null)
  const [scheduleInitial, setScheduleInitial] = useState<{ result: string; generatedAt: string } | null>(null)

  useEffect(() => {
    const loadLastInsights = async () => {
      try {
        const res = await fetch("/api/insights?limit=6")
        if (!res.ok) return
        const data = await res.json()
        const insights: any[] = data.insights || []

        const patternsInsight = insights.find((i) => i.analysis_type === "patterns")
        if (patternsInsight) {
          setPatternInitial({ result: patternsInsight.response, generatedAt: patternsInsight.created_at })
        }

        const recommendationsInsight = insights.find((i) => i.analysis_type === "recommendations")
        if (recommendationsInsight) {
          setRecommendationsInitial({ result: recommendationsInsight.response, generatedAt: recommendationsInsight.created_at })
        }

        const scheduleInsight = insights.find((i) => i.analysis_type === "schedule" || i.analysis_type === "schedule:optimize")
        if (scheduleInsight) {
          setScheduleInitial({ result: scheduleInsight.response, generatedAt: scheduleInsight.created_at })
        }
      } catch {
        // Ignorar errores al cargar historial
      }
    }
    loadLastInsights()
  }, [])

  const handleResponseGenerated = (type: 'patterns' | 'recommendations' | 'schedule', response: string) => {
    setLastResponse({
      text: response,
      type: type,
      timestamp: new Date().toISOString()
    })
  }

  const handleTestGemini = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/gemini/test")
      const data = await res.json()
      setTestResult(data)
    } catch (err) {
      setTestResult({ status: "error", stage: "network", message: "Error de red al conectar con el servidor" })
    } finally {
      setTestLoading(false)
    }
  }

  const handleLoadUsage = async () => {
    setUsageLoading(true)
    try {
      const res = await fetch("/api/gemini/usage")
      const data = await res.json()
      setUsageData(data)
    } catch {
      setUsageData({ error: "No se pudo cargar el uso" })
    } finally {
      setUsageLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pt-20 pb-20 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6 md:h-8 md:w-8 text-primary" />
              Laboratorio Timewize
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">Análisis inteligente con IA</p>
          </div>

          <Tabs defaultValue="analyze" className="space-y-4 md:space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="analyze" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Análisis
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="analyze" className="space-y-4 md:space-y-6">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Análisis en Tiempo Real
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Timewize AI analiza tus patrones de productividad y te ofrece recomendaciones personalizadas
                  </CardDescription>
                </CardHeader>
              </Card>

              <GeminiDemo />

              <div className="grid gap-4 md:gap-6 md:grid-cols-1">
                <PatternAnalysis
                  onResponseGenerated={(response) => handleResponseGenerated('patterns', response)}
                  initialResult={patternInitial?.result}
                  initialGeneratedAt={patternInitial?.generatedAt}
                />
                <Recommendations
                  onResponseGenerated={(response) => handleResponseGenerated('recommendations', response)}
                  initialResult={recommendationsInitial?.result}
                  initialGeneratedAt={recommendationsInitial?.generatedAt}
                />
                <ScheduleOptimizer
                  onResponseGenerated={(response) => handleResponseGenerated('schedule', response)}
                  initialResult={scheduleInitial?.result}
                  initialGeneratedAt={scheduleInitial?.generatedAt}
                />
              </div>

              {/* Evaluación siempre visible */}
              <SimpleEvaluation lastResponse={lastResponse} />

              {/* Diagnóstico de API Gemini */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4" />
                    Diagnóstico de API Gemini
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Verifica que tu GEMINI_API_KEY esté configurada y funcionando correctamente
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={handleTestGemini} disabled={testLoading} variant="outline" className="w-full">
                    {testLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Probando conexión...
                      </>
                    ) : (
                      "Probar conexión con Gemini"
                    )}
                  </Button>

                  {testResult && (
                    <div className={`p-3 rounded-lg border text-sm space-y-2 ${
                      testResult.status === "ok"
                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}>
                      <div className="flex items-center gap-2 font-medium">
                        {testResult.status === "ok" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                      {testResult.status === "ok" && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div><span className="font-medium">Modelo:</span> {testResult.model}</div>
                          <div><span className="font-medium">Latencia:</span> {testResult.latencyMs}ms</div>
                          <div><span className="font-medium">Key:</span> {testResult.keyPreview}</div>
                          <div><span className="font-medium">Respuesta:</span> {testResult.responseText}</div>
                        </div>
                      )}
                      {testResult.hint && (
                        <p className="text-xs opacity-80">💡 {testResult.hint}</p>
                      )}
                      {testResult.rawError && (
                        <pre className="text-xs bg-black/10 rounded p-2 overflow-x-auto">{testResult.rawError}</pre>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contador de uso de tokens / cuota Gemini */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart2 className="h-4 w-4" />
                    Uso de cuota Gemini
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Estimación de llamadas realizadas hoy vs límites del plan gratuito (gemini-2.5-flash-lite)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button onClick={handleLoadUsage} disabled={usageLoading} variant="outline" className="w-full gap-2">
                    {usageLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Ver uso actual
                      </>
                    )}
                  </Button>

                  {usageData && !usageData.error && (
                    <div className="space-y-3 text-sm">
                      {/* Barra de progreso */}
                      <div>
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Solicitudes hoy</span>
                          <span className="font-medium">
                            {usageData.today.calls} / {usageData.today.limit.toLocaleString()} ({usageData.today.percentUsed}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              usageData.today.percentUsed >= 90
                                ? "bg-red-500"
                                : usageData.today.percentUsed >= 70
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{ width: `${usageData.today.percentUsed}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">Restantes hoy</p>
                          <p className="font-bold text-base">{usageData.today.remaining.toLocaleString()}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">Este mes</p>
                          <p className="font-bold text-base">{usageData.month.calls}</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">Límite por minuto</p>
                          <p className="font-bold text-base">{usageData.limits.rpm} rpm</p>
                        </div>
                        <div className="p-2 rounded-lg bg-muted/50">
                          <p className="text-muted-foreground">Límite por día</p>
                          <p className="font-bold text-base">{usageData.limits.rpd.toLocaleString()} rpd</p>
                        </div>
                      </div>

                      {usageData.lastCall && (
                        <p className="text-xs text-muted-foreground">
                          Última llamada: <span className="font-medium">{usageData.lastCall.type}</span> —{" "}
                          {new Date(usageData.lastCall.at).toLocaleString("es-ES")}
                        </p>
                      )}

                      {usageData.today.percentUsed >= 80 && (
                        <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 text-xs text-yellow-800 dark:text-yellow-300">
                          ⚠️ Has usado más del 80% de tu cuota diaria. Los análisis pueden usar el modo fallback pronto.
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground opacity-70">{usageData.note}</p>
                    </div>
                  )}

                  {usageData?.error && (
                    <p className="text-xs text-destructive">{usageData.error}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <InsightsHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
