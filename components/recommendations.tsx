"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, Loader2 } from "lucide-react"

interface RecommendationsProps {
  onResponseGenerated?: (response: string) => void
}

export function Recommendations({ onResponseGenerated }: RecommendationsProps) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(null)

  const getRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          analysisType: "recommendations",
        }),
      })

      if (!response.ok) throw new Error("Error al obtener recomendaciones")

      const data = await response.json()
      console.log("Recommendations data:", data)
      
      const recommendationsResult = data.parsed || { text: data.response || "Sin respuesta del modelo" }
      setRecommendations(recommendationsResult)
      
      // Pasar la respuesta al componente padre
      if (onResponseGenerated) {
        onResponseGenerated(data.response || recommendationsResult.text || "")
      }
    } catch (error) {
      console.error(error)
      setRecommendations({ error: "Error al obtener recomendaciones" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
          Recomendaciones Personalizadas
        </CardTitle>
        <CardDescription>Sugerencias basadas en tu historial y estado de ánimo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={getRecommendations} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Obteniendo...
            </>
          ) : (
            "Obtener Recomendaciones"
          )}
        </Button>

        {recommendations && (
          <div className="space-y-3">
            {recommendations.error ? (
              <p className="text-sm text-destructive">{recommendations.error}</p>
            ) : (
              <>
                {recommendations.recommendations && Array.isArray(recommendations.recommendations) && (
                  <div className="space-y-2">
                    {recommendations.recommendations.map((rec: any, i: number) => (
                      <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <div className="text-sm">
                            {typeof rec === "string" ? rec : rec.recommendation || JSON.stringify(rec)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {recommendations.text && (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{recommendations.text}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

