"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"
import { AiInfoBanner } from "@/components/ai-info-banner"

interface PatternAnalysisProps {
  onResponseGenerated?: (response: string) => void
  initialResult?: string
  initialGeneratedAt?: string
}

const SUBKEY_LABELS: Record<string, string> = {
  rendimiento_pico: "Rendimiento Pico",
  peak_performance: "Rendimiento Pico",
  mañana: "Mañana",
  morning: "Mañana",
  tarde: "Tarde",
  afternoon: "Tarde",
  noche: "Noche",
  evening: "Noche",
  nivel: "Nivel",
  level: "Nivel",
  patron: "Patrón",
  pattern: "Patrón",
}

function labelForSubKey(key: string): string {
  return SUBKEY_LABELS[key] ?? key.replace(/_/g, " ")
}

function pick<T>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) if (obj[k] != null) return obj[k] as T
  return undefined
}

export function PatternAnalysis({ onResponseGenerated, initialResult, initialGeneratedAt }: PatternAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(() => {
    if (!initialResult) return null
    try { return JSON.parse(initialResult) } catch { return { text: initialResult } }
  })
  const [source, setSource] = useState<AiSource>("gemini")
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt ?? null)

  const analyzePatterns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "patterns" }),
      })

      if (!response.ok) throw new Error("Error al analizar")

      const data = await response.json()
      const analysisResult = data.parsed || { text: data.response || "Sin respuesta del modelo" }
      setAnalysis(analysisResult)
      setSource(data.source ?? "gemini")
      setCachedAt(data.cachedAt)
      setGeneratedAt(new Date().toISOString())

      if (onResponseGenerated) {
        onResponseGenerated(data.response || analysisResult.text || "")
      }
    } catch (error) {
      console.error(error)
      setAnalysis({ error: "Error al obtener análisis" })
    } finally {
      setLoading(false)
    }
  }

  const patrones = pick<string[]>(analysis ?? {}, "patrones", "patterns")
  const horariosOptimos = pick<Record<string, string>>(analysis ?? {}, "horarios_optimos", "optimal_times")
  const analisisPostergacion = pick<any>(analysis ?? {}, "analisis_postergacion", "procrastination_analysis")
  const estadoEstres = pick<any>(analysis ?? {}, "estado_estres", "stress_status")
  const correlaciones = pick<string[]>(analysis ?? {}, "correlaciones", "correlations")
  const recomendaciones = pick<string[]>(analysis ?? {}, "recomendaciones", "recommendations")

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Análisis de Patrones
        </CardTitle>
        <CardDescription>Detecta automáticamente tus horas más productivas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AiInfoBanner
          variant="info"
          compact
          message="Analiza tus tareas y estado de ánimo de los últimos 30 días para identificar tus horas y condiciones más productivas. Se recomienda al menos 7 días de actividad registrada para obtener resultados precisos."
        />
        <Button onClick={analyzePatterns} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : analysis ? (
            "Actualizar análisis"
          ) : (
            "Analizar Patrones"
          )}
        </Button>
        {generatedAt && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            Último análisis: {new Date(generatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {analysis && (
          <div className="space-y-3">
            {!analysis.error && source === "fallback" && (
              <AiInfoBanner
                variant="fallback"
                compact
                message="El servicio de IA no está disponible temporalmente. Se muestran patrones predefinidos basados en buenas prácticas de productividad. El análisis personalizado estará disponible cuando se restablezca la conexión."
              />
            )}
            {!analysis.error && <AiSourceBadge source={source} cachedAt={cachedAt} />}
            {analysis.error ? (
              <p className="text-sm text-destructive">{analysis.error}</p>
            ) : (
              <>
                {patrones && patrones.length > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Patrones Detectados</h4>
                    <ul className="text-sm space-y-1">
                      {patrones.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {horariosOptimos && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Horarios Óptimos</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(horariosOptimos).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium capitalize">{labelForSubKey(key)}:</span>{" "}
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analisisPostergacion && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Análisis de Postergación</h4>
                    <div className="text-sm space-y-1">
                      {(analisisPostergacion.categorias_en_riesgo || analisisPostergacion.categories_at_risk)?.length > 0 && (
                        <div>
                          <span className="font-medium">Categorías en riesgo:</span>{" "}
                          {(analisisPostergacion.categorias_en_riesgo || analisisPostergacion.categories_at_risk).join(", ")}
                        </div>
                      )}
                      {(analisisPostergacion.patron || analisisPostergacion.pattern) && (
                        <div>
                          <span className="font-medium">Patrón:</span>{" "}
                          {analisisPostergacion.patron || analisisPostergacion.pattern}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {estadoEstres && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Estado de Estrés</h4>
                    <div className="text-sm space-y-1">
                      {(estadoEstres.nivel || estadoEstres.level) && (
                        <div>
                          <span className="font-medium">Nivel:</span>{" "}
                          <span className="capitalize">{estadoEstres.nivel || estadoEstres.level}</span>
                        </div>
                      )}
                      {(estadoEstres.recomendaciones || estadoEstres.recommendations)?.length > 0 && (
                        <ul className="mt-1 space-y-1">
                          {(estadoEstres.recomendaciones || estadoEstres.recommendations).map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-purple-600">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {correlaciones && correlaciones.length > 0 && (
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Correlaciones</h4>
                    <ul className="text-sm space-y-1">
                      {correlaciones.map((c: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-600">•</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {recomendaciones && recomendaciones.length > 0 && (
                  <div className="p-3 bg-teal-50 dark:bg-teal-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Recomendaciones</h4>
                    <ul className="text-sm space-y-1">
                      {recomendaciones.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-teal-600">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.text && (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{analysis.text}</pre>
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
