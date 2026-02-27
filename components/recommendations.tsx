"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, Loader2 } from "lucide-react"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"

interface RecommendationsProps {
  onResponseGenerated?: (response: string) => void
  initialResult?: string
  initialGeneratedAt?: string
}

export function Recommendations({ onResponseGenerated, initialResult, initialGeneratedAt }: RecommendationsProps) {
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<any>(() => {
    if (!initialResult) return null
    try { return JSON.parse(initialResult) } catch { return { text: initialResult } }
  })
  const [source, setSource] = useState<AiSource>("gemini")
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt ?? null)

  const getRecommendations = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "recommendations" }),
      })

      if (!response.ok) throw new Error("Error al obtener recomendaciones")

      const data = await response.json()
      const recommendationsResult = data.parsed || { text: data.response || "Sin respuesta del modelo" }
      setRecommendations(recommendationsResult)
      setSource(data.source ?? "gemini")
      setCachedAt(data.cachedAt)
      setGeneratedAt(new Date().toISOString())

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
          ) : recommendations ? (
            "Actualizar recomendaciones"
          ) : (
            "Obtener Recomendaciones"
          )}
        </Button>
        {generatedAt && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            Último análisis: {new Date(generatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {recommendations && (
          <div className="space-y-3">
            {!recommendations.error && <AiSourceBadge source={source} cachedAt={cachedAt} />}
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

