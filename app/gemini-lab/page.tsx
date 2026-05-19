"use client"
import { useState, useEffect } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeminiDemo } from "@/components/gemini-demo"
import { PatternAnalysis } from "@/components/pattern-analysis"
import { Recommendations } from "@/components/recommendations"
import { ScheduleOptimizer } from "@/components/schedule-optimizer"
import { InsightsHistory } from "@/components/insights-history"
import { SimpleEvaluation } from "@/components/simple-evaluation"
import { AiInfoBanner } from "@/components/ai-info-banner"
import { Brain, Sparkles, History } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

export default function GeminiLabPage() {
  const [lastResponse, setLastResponse] = useState<{
    text: string
    type: string
    timestamp: string
  } | undefined>()
  const [patternInitial, setPatternInitial] = useState<{ result: string; generatedAt: string } | null>(null)
  const [recommendationsInitial, setRecommendationsInitial] = useState<{ result: string; generatedAt: string } | null>(null)
  const [scheduleInitial, setScheduleInitial] = useState<{ result: string; generatedAt: string } | null>(null)
  const [quotaPercent, setQuotaPercent] = useState<number | null>(null)

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
        // ignorar
      }
    }

    const loadQuota = async () => {
      try {
        const res = await fetch("/api/gemini/usage")
        if (!res.ok) return
        const data = await res.json()
        if (data?.today?.percentUsed != null) {
          setQuotaPercent(data.today.percentUsed)
        }
      } catch {
        // ignorar — es informativo
      }
    }

    loadLastInsights()
    loadQuota()
  }, [])

  const handleResponseGenerated = (type: 'patterns' | 'recommendations' | 'schedule', response: string) => {
    setLastResponse({ text: response, type, timestamp: new Date().toISOString() })
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

          {/* Aviso de cuota — solo cuando supera el 70% */}
          {quotaPercent !== null && quotaPercent >= 70 && (
            <div className="mb-4">
              <AiInfoBanner
                variant={quotaPercent >= 90 ? "quota" : "warning"}
                title={quotaPercent >= 90 ? "Cuota de IA casi agotada" : "Cuota de IA al " + quotaPercent + "%"}
                message={
                  quotaPercent >= 90
                    ? "La cuota diaria del servicio de IA está casi agotada (plan gratuito: 1.000 solicitudes/día). Los análisis pueden usar respuestas de respaldo hasta las 00:00 UTC, cuando se restablece la cuota."
                    : "Se ha usado más del 70% de la cuota diaria de IA. Si se agota, los análisis usarán respuestas predefinidas de forma temporal. La cuota se restablece cada día a las 00:00 UTC."
                }
                dismissId={`quota-warn-${new Date().toDateString()}`}
              />
            </div>
          )}

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
              {/* Tarjeta de presentación con disclaimer de IA */}
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                    <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Análisis en Tiempo Real
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Timewize AI analiza tus patrones de productividad y te ofrece recomendaciones personalizadas
                  </CardDescription>
                  <AiInfoBanner
                    variant="info"
                    compact
                    message="Timewize AI utiliza Google Gemini (plan gratuito: 1.000 solicitudes/día · 15/minuto). Los resultados se cachean automáticamente por 24 horas para optimizar el uso. Si la cuota se agota, se activa el Modo de Asistencia Local con sugerencias predefinidas hasta el día siguiente."
                    className="mt-2"
                  />
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

              <SimpleEvaluation lastResponse={lastResponse} />
            </TabsContent>

            <TabsContent value="history">
              <AiInfoBanner
                variant="info"
                compact
                message="El historial muestra tus últimos 20 análisis generados. Los resultados se guardan en tu cuenta y son solo visibles para ti."
                className="mb-4"
              />
              <InsightsHistory />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
