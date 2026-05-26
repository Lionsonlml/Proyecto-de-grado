"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Brain, RefreshCw, Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface MoodStateResponse {
  success: boolean
  state: string
  summary: {
    avgMood: number
    avgEnergy: number
    avgFocus: number
    avgStress: number
    trend: number
    count: number
  }
  source?: "cache" | "gemini" | "fallback" | "empty"
  cachedAt?: string
}

interface MoodAiStateProps {
  // Si se pasa, el componente se refresca cuando este valor cambia
  refreshKey?: string | number
}

export function MoodAiState({ refreshKey }: MoodAiStateProps) {
  const [data, setData]       = useState<MoodStateResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetchState = useCallback(async (force = false) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gemini/mood-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json() as MoodStateResponse
      setData(json)
    } catch (err: any) {
      setError(err?.message || "Error de conexión")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Carga automática (sin force) → puede usar caché
    fetchState(false)
  }, [fetchState, refreshKey])

  // Refresh manual → siempre fuerza llamada a Gemini
  const handleManualRefresh = () => fetchState(true)

  const trend = data?.summary.trend ?? 0
  const TrendIcon  = trend > 0.15 ? TrendingUp : trend < -0.15 ? TrendingDown : Minus
  const trendText  = trend > 0.15 ? "Mejorando" : trend < -0.15 ? "Bajando" : "Estable"
  const trendColor = trend > 0.15 ? "text-green-600 dark:text-green-400"
    : trend < -0.15 ? "text-red-600 dark:text-red-400"
    : "text-muted-foreground"

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-md bg-primary/10 p-1.5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            Tu estado emocional según la IA
          </CardTitle>
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={loading}
            className="text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors"
            aria-label="Refrescar análisis con nueva consulta a la IA"
            title="Refrescar con nueva consulta a la IA"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>
        <CardDescription>
          Análisis automático basado en tus últimos registros
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">

        {/* ── Loading ─────────────────────────────────────────────── */}
        {loading && !data && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[60%]" />
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────── */}
        {error && !loading && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="text-xs underline hover:no-underline mt-1"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* ── Datos ───────────────────────────────────────────────── */}
        {data && !error && (
          <>
            <p className={cn(
              "text-sm leading-relaxed text-foreground/90",
              loading && "opacity-50 transition-opacity",
            )}>
              {data.state}
            </p>

            {/* Summary chips */}
            {data.summary.count > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t">
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted">
                  <Brain className="h-3 w-3" />
                  {data.summary.count} registro{data.summary.count !== 1 ? "s" : ""}
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full",
                  trend > 0.15 ? "bg-green-500/10"
                  : trend < -0.15 ? "bg-red-500/10"
                  : "bg-muted",
                  trendColor,
                )}>
                  <TrendIcon className="h-3 w-3" />
                  {trendText}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                  {data.source === "cache"     && "Desde caché"}
                  {data.source === "gemini"    && "Generado por IA"}
                  {data.source === "fallback"  && "Análisis heurístico"}
                  {data.source === "empty"     && "Sin datos suficientes"}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
