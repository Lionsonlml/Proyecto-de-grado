"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Lightbulb, Loader2, Star, AlertCircle } from "lucide-react"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"
import { AiInfoBanner } from "@/components/ai-info-banner"

interface RecommendationsProps {
  onResponseGenerated?: (response: string) => void
  initialResult?: string
  initialGeneratedAt?: string
}

function pick<T>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) if (obj[k] != null) return obj[k] as T
  return undefined
}

export function Recommendations({ onResponseGenerated, initialResult, initialGeneratedAt }: RecommendationsProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(() => {
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
      const parsed = data.parsed || { text: data.response || "Sin respuesta del modelo" }
      setResult(parsed)
      setSource(data.source ?? "gemini")
      setCachedAt(data.cachedAt)
      setGeneratedAt(new Date().toISOString())

      if (onResponseGenerated) {
        onResponseGenerated(data.response || parsed.text || "")
      }
    } catch (error) {
      console.error(error)
      setResult({ error: "Error al obtener recomendaciones" })
    } finally {
      setLoading(false)
    }
  }

  const recomendaciones = pick<string[]>(result ?? {}, "recomendaciones", "recommendations")
  const accionPrioritaria = pick<string>(result ?? {}, "accion_prioritaria", "priority_action")
  const notaEstres = pick<string>(result ?? {}, "nota_estres", "stress_note")

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
        <AiInfoBanner
          variant="info"
          compact
          message="Las sugerencias son orientativas y se basan en tus registros de tareas y estado de ánimo. No reemplazan asesoramiento médico, psicológico ni profesional de ningún tipo."
        />
        <Button onClick={getRecommendations} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Obteniendo...
            </>
          ) : result ? (
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

        {result && (
          <div className="space-y-3">
            {!result.error && source === "fallback" && (
              <AiInfoBanner
                variant="fallback"
                compact
                message="El servicio de IA no está disponible en este momento. Se muestran consejos generales de productividad. Las recomendaciones personalizadas estarán disponibles cuando se restablezca la conexión."
              />
            )}
            {!result.error && <AiSourceBadge source={source} cachedAt={cachedAt} />}
            {result.error ? (
              <p className="text-sm text-destructive">{result.error}</p>
            ) : (
              <>
                {accionPrioritaria && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                    <div className="flex items-start gap-2">
                      <Star className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-primary mb-1">Acción Prioritaria de Hoy</p>
                        <p className="text-sm">{accionPrioritaria}</p>
                      </div>
                    </div>
                  </div>
                )}

                {notaEstres && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-orange-700 dark:text-orange-400 mb-1">Nota sobre Estrés</p>
                        <p className="text-sm">{notaEstres}</p>
                      </div>
                    </div>
                  </div>
                )}

                {recomendaciones && Array.isArray(recomendaciones) && recomendaciones.length > 0 && (
                  <div className="space-y-2">
                    {recomendaciones.map((rec: any, i: number) => (
                      <div key={i} className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5 shrink-0" />
                          <p className="text-sm">
                            {typeof rec === "string" ? rec : rec.recommendation || JSON.stringify(rec)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {result.text && (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{result.text}</pre>
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
