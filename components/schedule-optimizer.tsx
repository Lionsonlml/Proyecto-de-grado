"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Loader2 } from "lucide-react"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"

interface ScheduleOptimizerProps {
  onResponseGenerated?: (response: string) => void
  initialResult?: string
  initialGeneratedAt?: string
}

export function ScheduleOptimizer({ onResponseGenerated, initialResult, initialGeneratedAt }: ScheduleOptimizerProps) {
  const [loading, setLoading] = useState(false)
  const [schedule, setSchedule] = useState<any>(() => {
    if (!initialResult) return null
    try { return JSON.parse(initialResult) } catch { return { text: initialResult } }
  })
  const [source, setSource] = useState<AiSource>("gemini")
  const [cachedAt, setCachedAt] = useState<string | undefined>()
  const [generatedAt, setGeneratedAt] = useState<string | null>(initialGeneratedAt ?? null)

  const optimizeSchedule = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "schedule" }),
      })

      if (!response.ok) throw new Error("Error al optimizar horario")

      const data = await response.json()
      const scheduleResult = data.parsed || { text: data.response || "Sin respuesta del modelo" }
      setSchedule(scheduleResult)
      setSource(data.source ?? "gemini")
      setCachedAt(data.cachedAt)
      setGeneratedAt(new Date().toISOString())

      if (onResponseGenerated) {
        onResponseGenerated(data.response || scheduleResult.text || "")
      }
    } catch (error) {
      console.error(error)
      setSchedule({ error: "Error al optimizar horario" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-purple-600" />
          Optimización de Horarios
        </CardTitle>
        <CardDescription>Reorganiza automáticamente tus tareas para máxima eficiencia</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={optimizeSchedule} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Optimizando...
            </>
          ) : schedule ? (
            "Actualizar horario"
          ) : (
            "Optimizar Horario"
          )}
        </Button>
        {generatedAt && !loading && (
          <p className="text-xs text-muted-foreground text-center">
            Último análisis: {new Date(generatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        )}

        {schedule && (
          <div className="space-y-3">
            {!schedule.error && <AiSourceBadge source={source} cachedAt={cachedAt} />}
            {schedule.error ? (
              <p className="text-sm text-destructive">{schedule.error}</p>
            ) : (
              <>
                {schedule.schedule && Array.isArray(schedule.schedule) && (
                  <div className="space-y-2">
                    {schedule.schedule.map((item: any, i: number) => (
                      <div key={i} className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                        <div className="flex items-start gap-3">
                          <div className="font-mono text-xs font-semibold text-purple-600 mt-0.5">
                            {item.time || item.hour || `${i + 1}.`}
                          </div>
                          <div className="flex-1 text-sm">
                            {typeof item === "string" ? item : item.task || item.activity || JSON.stringify(item)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {schedule.text && (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{schedule.text}</pre>
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

