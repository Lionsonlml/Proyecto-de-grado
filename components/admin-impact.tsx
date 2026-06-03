"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Sparkles, TrendingUp, TrendingDown, Minus, Loader2, Gauge, HeartPulse, ShieldCheck,
} from "lucide-react"

// ─── Tipos (espejo de /api/admin/impact) ─────────────────────────────────────

interface WeekPoint {
  week: string
  productivity: number | null
  wellbeing: number | null
  avgEnergy: number | null
  avgFocus: number | null
  avgStress: number | null
  taskSamples: number
  moodSamples: number
}

interface Delta {
  baseline: number
  recent: number
  change: number
  baselineWeek: string
  recentWeek: string
  weeksTracked: number
  trend: "up" | "down" | "flat"
}

interface ImpactData {
  weeks: WeekPoint[]
  productivity: Delta | null
  wellbeing: Delta | null
  meta: {
    weekCount: number
    totalTasks: number
    totalMoods: number
    minRecordsPerWeek: number
    lookbackDays: number
    generatedAt: string
  }
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

const MONTHS_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

function weekLabel(iso: string): string {
  const parts = iso.split("-").map(Number)
  const [y, m, d] = parts
  if (!y || !m || !d) return iso
  return `${d} ${MONTHS_ES[m - 1]}`
}

const TOOLTIP_STYLE = {
  background: "hsl(var(--popover))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  fontSize: "12px",
} as const

// ─── Tarjeta de comparativa (primera vs. semana actual) ──────────────────────

function DeltaCard({
  title,
  icon,
  delta,
  unit,
  decimals,
  color,
}: {
  title: string
  icon: React.ReactNode
  delta: Delta | null
  unit: string
  decimals: number
  color: string
}) {
  const fmt = (n: number) => `${n.toFixed(decimals)}${unit}`

  if (!delta) {
    return (
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span style={{ color }}>{icon}</span> {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">Aún no hay suficientes datos para comparar.</p>
        </CardContent>
      </Card>
    )
  }

  const single = delta.weeksTracked <= 1
  const TrendIcon = delta.trend === "up" ? TrendingUp : delta.trend === "down" ? TrendingDown : Minus
  const trendColor =
    delta.trend === "up"
      ? "text-green-600 dark:text-green-400"
      : delta.trend === "down"
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground"
  const sign = delta.change > 0 ? "+" : ""

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <span style={{ color }}>{icon}</span> {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-2">
        {single ? (
          <>
            <div className="text-2xl font-bold" style={{ color }}>
              {fmt(delta.recent)}
            </div>
            <p className="text-xs text-muted-foreground">
              Semana del {weekLabel(delta.recentWeek)}. Aún no hay una semana previa para comparar.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{fmt(delta.baseline)}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-2xl font-bold" style={{ color }}>
                {fmt(delta.recent)}
              </span>
              <span className={`flex items-center gap-1 text-sm font-semibold ml-auto ${trendColor}`}>
                <TrendIcon className="h-4 w-4" />
                {sign}
                {delta.change.toFixed(decimals)}
                {unit}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Primera semana ({weekLabel(delta.baselineWeek)}) vs. actual ({weekLabel(delta.recentWeek)}) ·{" "}
              {delta.weeksTracked} semanas con datos
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function AdminImpact() {
  const [data, setData] = useState<ImpactData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/admin/impact", { credentials: "include" })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.error ?? `Error ${res.status}`)
        }
        const json = (await res.json()) as ImpactData
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error desconocido")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const header = (
    <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
      <Sparkles className="h-4 w-4" /> Impacto en usuarios — Productividad y Bienestar
    </h2>
  )

  if (loading) {
    return (
      <section className="space-y-3">
        {header}
        <Card>
          <CardContent className="p-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculando indicadores de impacto...
          </CardContent>
        </Card>
      </section>
    )
  }

  if (error) {
    return (
      <section className="space-y-3">
        {header}
        <Card>
          <CardContent className="p-4 text-sm text-red-600 dark:text-red-400">
            No se pudo cargar el módulo de impacto: {error}
          </CardContent>
        </Card>
      </section>
    )
  }

  if (!data || data.weeks.length === 0) {
    return (
      <section className="space-y-3">
        {header}
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Aún no hay suficientes datos para evidenciar el impacto. A medida que los usuarios registren
            tareas y estados de ánimo, aquí aparecerán las tendencias de productividad y bienestar.
          </CardContent>
        </Card>
      </section>
    )
  }

  const chartData = data.weeks.map((w) => ({
    label: weekLabel(w.week),
    productivity: w.productivity,
    wellbeing: w.wellbeing,
  }))

  return (
    <section className="space-y-3">
      {header}

      <Card>
        <CardHeader className="p-4 pb-2">
          <CardDescription className="text-xs">
            Evidencia del objetivo general: <em>mejorar la productividad y el bienestar de los usuarios</em>.
            Indicadores <strong>agregados y anónimos</strong> calculados por semana a partir de tareas y
            registros de ánimo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-4">
          {/* Comparativa: primera semana vs. semana actual */}
          <div className="grid gap-3 sm:grid-cols-2">
            <DeltaCard
              title="Productividad (% tareas completadas)"
              icon={<Gauge className="h-4 w-4" />}
              delta={data.productivity}
              unit="%"
              decimals={0}
              color="#10b981"
            />
            <DeltaCard
              title="Bienestar (índice 1–5)"
              icon={<HeartPulse className="h-4 w-4" />}
              delta={data.wellbeing}
              unit=""
              decimals={2}
              color="#6366f1"
            />
          </div>

          {/* Tendencia semanal — Productividad */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Gauge className="h-3.5 w-3.5" style={{ color: "#10b981" }} />
              Tendencia de productividad (% de tareas completadas por semana)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number | null) => [value === null ? "—" : `${value}%`, "Productividad"]}
                />
                <Line
                  type="monotone"
                  dataKey="productivity"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Tendencia semanal — Bienestar */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium">
              <HeartPulse className="h-3.5 w-3.5" style={{ color: "#6366f1" }} />
              Tendencia de bienestar (índice energía + concentración + estrés invertido, 1–5)
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(value: number | null) => [value === null ? "—" : value.toFixed(2), "Bienestar"]}
                />
                <Line
                  type="monotone"
                  dataKey="wellbeing"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Nota de privacidad / metodología */}
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t pt-3">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-green-600" />
            <span>
              Privacidad por diseño: solo se muestran promedios agregados (sin datos personales ni contenido
              de tareas). Una semana solo se publica con ≥ {data.meta.minRecordsPerWeek} registros.{" "}
              {data.meta.weekCount} semanas analizadas · {data.meta.totalTasks} tareas · {data.meta.totalMoods}{" "}
              registros de ánimo.
            </span>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
