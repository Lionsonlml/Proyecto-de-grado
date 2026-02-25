"use client"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GeminiDemo } from "@/components/gemini-demo"
import { PatternAnalysis } from "@/components/pattern-analysis"
import { Recommendations } from "@/components/recommendations"
import { ScheduleOptimizer } from "@/components/schedule-optimizer"
import { InsightsHistory } from "@/components/insights-history"
import { SimpleEvaluation } from "@/components/simple-evaluation"
import { Brain, Sparkles, History, Target } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

export default function GeminiLabPage() {
  const [lastResponse, setLastResponse] = useState<{
    text: string
    type: string
    timestamp: string
  } | undefined>()

  const handleResponseGenerated = (type: 'patterns' | 'recommendations' | 'schedule', response: string) => {
    setLastResponse({
      text: response,
      type: type,
      timestamp: new Date().toISOString()
    })
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
                <PatternAnalysis onResponseGenerated={(response) => handleResponseGenerated('patterns', response)} />
                <Recommendations onResponseGenerated={(response) => handleResponseGenerated('recommendations', response)} />
                <ScheduleOptimizer onResponseGenerated={(response) => handleResponseGenerated('schedule', response)} />
              </div>

              {/* Evaluación siempre visible */}
              <SimpleEvaluation lastResponse={lastResponse} />
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
