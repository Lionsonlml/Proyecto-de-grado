"use client"

import { useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts"
import {
  Activity, Brain, Clock, Calendar, AlertCircle,
  TrendingUp, TrendingDown, Minus, ArrowUpDown,
} from "lucide-react"
import type { Mood } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatBogotaShortDate, getBogotaHour, parseDbTimestamp } from "@/lib/timezone"

interface MoodPatternsProps {
  moods: Mood[]
}

// ─── Catálogo de factores (espejo del MoodTracker) ───────────────────────────

type Polarity = "+" | "-" | "~"

const FACTOR_CATALOG: Record<string, { label: string; group: string; polarity: Polarity }> = {
  "sleep-good":      { label: "Dormí bien (7–8h)",        group: "Sueño",   polarity: "+" },
  "sleep-short":     { label: "Dormí poco (<6h)",         group: "Sueño",   polarity: "-" },
  "sleep-broken":    { label: "Sueño interrumpido",       group: "Sueño",   polarity: "-" },
  "sleep-nap":       { label: "Tomé siesta hoy",          group: "Sueño",   polarity: "~" },
  "exercised":       { label: "Hice ejercicio",           group: "Cuerpo",  polarity: "+" },
  "caffeine":        { label: "Tomé cafeína",             group: "Cuerpo",  polarity: "~" },
  "ate-recently":    { label: "Comí hace <1h",            group: "Cuerpo",  polarity: "~" },
  "fasting":         { label: "Llevo +4h sin comer",      group: "Cuerpo",  polarity: "-" },
  "feeling-unwell":  { label: "Malestar físico",          group: "Cuerpo",  polarity: "-" },
  "quiet-space":     { label: "Espacio silencioso",       group: "Entorno", polarity: "+" },
  "noisy":           { label: "Ruido o distracciones",    group: "Entorno", polarity: "-" },
  "no-notifs":       { label: "Notificaciones apagadas",  group: "Entorno", polarity: "+" },
  "interruptions":   { label: "Interrupciones constantes",group: "Entorno", polarity: "-" },
  "calm-day":        { label: "Día tranquilo",            group: "Mental",  polarity: "+" },
  "deadlines":       { label: "Deadlines / urgencias",    group: "Mental",  polarity: "-" },
  "good-news":       { label: "Buena noticia",            group: "Mental",  polarity: "+" },
  "conflict":        { label: "Conflicto reciente",       group: "Mental",  polarity: "-" },
  "multitask":       { label: "Multitarea intensa",       group: "Mental",  polarity: "-" },
}

const MOOD_VALUES: Record<Mood["mood"], number> = {
  "muy-mal": 1, "mal": 2, "neutral": 3, "bien": 4, "excelente": 5,
}

const MOOD_COLORS: Record<Mood["mood"], string> = {
  "muy-mal":   "#dc2626",
  "mal":       "#f97316",
  "neutral":   "#eab308",
  "bien":      "#22c55e",
  "excelente": "#10b981",
}

const MOOD_LABELS: Record<Mood["mood"], string> = {
  "muy-mal": "Muy Mal", "mal": "Mal", "neutral": "Neutral",
  "bien": "Bien", "excelente": "Excelente",
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getHourFromTimestamp(ts: string): number {
  return getBogotaHour(ts)
}

function getShortDate(ts: string): string {
  return formatBogotaShortDate(ts)
}

// ─── Componente principal ───────────────────────────────────────────────────

// ─── Helpers de cálculo (puros, fuera del componente) ───────────────────────

const avgRound = (values: number[]): number =>
  +(values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)

function buildSortedByDate(moods: Mood[]): Mood[] {
  return [...moods].sort(
    (a, b) => parseDbTimestamp(a.timestamp).getTime() - parseDbTimestamp(b.timestamp).getTime(),
  )
}

function buildRecent14(sortedMoods: Mood[]) {
  return sortedMoods.slice(-14).map((m, i) => ({
    idx: i + 1,
    date: getShortDate(m.timestamp),
    Energía: m.energy,
    Concentración: m.focus,
    Estrés: m.stress,
  }))
}

function buildByHour(moods: Mood[]) {
  const buckets: Record<number, { e: number[]; f: number[]; s: number[] }> = {}
  for (const m of moods) {
    const h = getHourFromTimestamp(m.timestamp)
    if (!buckets[h]) buckets[h] = { e: [], f: [], s: [] }
    buckets[h].e.push(m.energy)
    buckets[h].f.push(m.focus)
    buckets[h].s.push(m.stress)
  }
  return Object.entries(buckets)
    .map(([h, d]) => ({
      hour: `${String(h).padStart(2, "0")}h`,
      hourNum: Number(h),
      Energía: avgRound(d.e),
      Concentración: avgRound(d.f),
      Estrés: avgRound(d.s),
      n: d.e.length,
    }))
    .sort((a, b) => a.hourNum - b.hourNum)
}

function buildMoodDistribution(moods: Mood[]) {
  const counts: Record<Mood["mood"], number> = {
    "muy-mal": 0, "mal": 0, "neutral": 0, "bien": 0, "excelente": 0,
  }
  moods.forEach(m => { counts[m.mood]++ })
  return (Object.entries(counts) as [Mood["mood"], number][])
    .filter(([, count]) => count > 0)
    .map(([mood, count]) => ({
      name: MOOD_LABELS[mood],
      value: count,
      color: MOOD_COLORS[mood],
      percent: Math.round((count / moods.length) * 100),
    }))
}

function findBestHour(byHour: ReturnType<typeof buildByHour>) {
  let best: { hour: number; score: number; n: number } | null = null
  for (const slot of byHour) {
    const score = slot.Energía + slot.Concentración - slot.Estrés
    if (!best || score > best.score) {
      best = { hour: slot.hourNum, score, n: slot.n }
    }
  }
  return best
}

function calculateTrend(sortedMoods: Mood[]): number {
  if (sortedMoods.length < 3) return 0
  const values = sortedMoods.map(m => MOOD_VALUES[m.mood])
  const n = values.length
  const sumX = (n * (n - 1)) / 2
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = values.reduce((a, b, i) => a + i * b, 0)
  const sumXX = (n * (n - 1) * (2 * n - 1)) / 6
  const denom = n * sumXX - sumX * sumX
  if (denom === 0) return 0
  return (n * sumXY - sumX * sumY) / denom
}

function buildStats(args: {
  moods: Mood[]
  byHour: ReturnType<typeof buildByHour>
  moodDistribution: ReturnType<typeof buildMoodDistribution>
  sortedByDate: Mood[]
}) {
  const { moods, byHour, moodDistribution, sortedByDate } = args
  const withTest = moods.filter(m => m.concentrationScore != null)
  const avgTestScore = withTest.length > 0
    ? Math.round(withTest.reduce((s, m) => s + (m.concentrationScore ?? 0), 0) / withTest.length)
    : null
  const top = [...moodDistribution].sort((a, b) => b.value - a.value)[0]
  return {
    total: moods.length,
    avgTestScore,
    bestHour: findBestHour(byHour),
    top,
    trend: calculateTrend(sortedByDate),
    withTestCount: withTest.length,
  }
}

function buildTopFactors(moods: Mood[]) {
  const counts: Record<string, number> = {}
  moods.forEach(m => {
    (m.contextFactors ?? []).forEach(f => {
      if (f.startsWith("__test:")) return
      counts[f] = (counts[f] || 0) + 1
    })
  })
  const all = Object.entries(counts)
    .map(([id, count]) => ({ id, count, def: FACTOR_CATALOG[id] }))
    .filter(x => x.def)
    .sort((a, b) => b.count - a.count)

  return {
    positive: all.filter(x => x.def!.polarity === "+").slice(0, 5),
    negative: all.filter(x => x.def!.polarity === "-").slice(0, 5),
  }
}

function buildDiscrepancies(moods: Mood[]) {
  return moods
    .filter(m => m.concentrationScore != null)
    .map(m => {
      const sliderNorm = (m.focus / 5) * 100
      const diff = (m.concentrationScore ?? 0) - sliderNorm
      return { mood: m, diff, sliderNorm, objScore: m.concentrationScore ?? 0 }
    })
    .filter(x => Math.abs(x.diff) >= 25)
    .sort((a, b) => new Date(b.mood.timestamp).getTime() - new Date(a.mood.timestamp).getTime())
    .slice(0, 5)
}

// ─── Empty state component ───────────────────────────────────────────────────

function EmptyPatterns({ count }: { count: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Patrones emocionales
        </CardTitle>
        <CardDescription>
          Necesitas al menos 3 registros para ver patrones. Llevas {count}.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground max-w-sm">
            Registra tu estado de ánimo regularmente. Cuantos más registros tengas,
            más precisos serán los patrones que detectemos.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export function MoodPatterns({ moods }: MoodPatternsProps) {
  // Hooks SIEMPRE antes de cualquier return condicional (Rules of Hooks)
  const sortedByDate     = useMemo(() => buildSortedByDate(moods), [moods])
  const recent14         = useMemo(() => buildRecent14(sortedByDate), [sortedByDate])
  const byHour           = useMemo(() => buildByHour(moods), [moods])
  const moodDistribution = useMemo(() => buildMoodDistribution(moods), [moods])
  const stats            = useMemo(
    () => buildStats({ moods, byHour, moodDistribution, sortedByDate }),
    [moods, byHour, moodDistribution, sortedByDate],
  )
  const topFactors       = useMemo(() => buildTopFactors(moods), [moods])
  const discrepancies    = useMemo(() => buildDiscrepancies(moods), [moods])

  // Early return DESPUÉS de los hooks
  if (moods.length < 3) {
    return <EmptyPatterns count={moods.length} />
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 md:space-y-6">

      {/* ── Stats grid ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Calendar}
          label="Registros totales"
          value={String(stats.total)}
          sub={`${stats.withTestCount} con test objetivo`}
        />
        <StatCard
          icon={Brain}
          label="Score test promedio"
          value={stats.avgTestScore != null ? `${stats.avgTestScore}/100` : "—"}
          sub={stats.withTestCount > 0 ? "Mini-tests realizados" : "Sin tests aún"}
          accent={stats.avgTestScore != null && stats.avgTestScore >= 70 ? "good" : "neutral"}
        />
        <StatCard
          icon={Clock}
          label="Mejor hora del día"
          value={stats.bestHour ? `${String(stats.bestHour.hour).padStart(2, "0")}:00` : "—"}
          sub={stats.bestHour ? `${stats.bestHour.n} registro(s)` : "Sin datos"}
          accent="good"
        />
        <StatCard
          icon={
            stats.trend > 0.15 ? TrendingUp
            : stats.trend < -0.15 ? TrendingDown
            : Minus
          }
          label="Tendencia general"
          value={
            stats.trend > 0.15 ? "Mejorando"
            : stats.trend < -0.15 ? "Bajando"
            : "Estable"
          }
          sub={stats.top ? `Mood frecuente: ${stats.top.name}` : ""}
          accent={
            stats.trend > 0.15 ? "good"
            : stats.trend < -0.15 ? "bad"
            : "neutral"
          }
        />
      </div>

      {/* ── Tendencia temporal (line chart) ─────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" /> Evolución temporal
          </CardTitle>
          <CardDescription>
            Últimos {recent14.length} registros · cómo varían tus dimensiones a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={recent14} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="idx" className="text-xs" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
                labelFormatter={(v) => `Registro #${v}`}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line type="monotone" dataKey="Energía"       stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Concentración" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="Estrés"        stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Por hora del día (bar chart) ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" /> Patrones por hora del día
          </CardTitle>
          <CardDescription>
            Promedio de cada dimensión según la hora en que registras — identifica tus picos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byHour} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} className="text-xs" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: "12px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="Energía"       fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Concentración" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Estrés"        fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Distribución de moods + Top factores ────────────────────── */}
      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribución de moods</CardTitle>
            <CardDescription>
              Cómo se reparten tus {moods.length} registros
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={moodDistribution}
                  cx="50%" cy="50%"
                  innerRadius={45} outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {moodDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                  formatter={(value: any, _name: any, props: any) =>
                    [`${value} (${props.payload.percent}%)`, props.payload.name]
                  }
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {moodDistribution.map(m => (
                <div key={m.name} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: m.color }} />
                  <span className="text-muted-foreground">{m.name}</span>
                  <span className="font-medium tabular-nums ml-auto">{m.percent}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Factores más frecuentes</CardTitle>
            <CardDescription>
              Patrones contextuales que más se repiten en tus registros
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topFactors.positive.length === 0 && topFactors.negative.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Aún no has marcado factores contextuales
              </p>
            ) : (
              <>
                {topFactors.positive.length > 0 && (
                  <FactorRanking
                    title="Positivos (+)"
                    titleColor="text-green-600 dark:text-green-400"
                    items={topFactors.positive}
                    totalMoods={moods.length}
                    barColor="bg-green-500"
                  />
                )}
                {topFactors.negative.length > 0 && (
                  <FactorRanking
                    title="Negativos (−)"
                    titleColor="text-red-600 dark:text-red-400"
                    items={topFactors.negative}
                    totalMoods={moods.length}
                    barColor="bg-red-500"
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Discrepancias subjetivo vs objetivo ─────────────────────── */}
      {discrepancies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4" /> Subjetivo vs Objetivo
            </CardTitle>
            <CardDescription>
              Momentos donde tu percepción de concentración difirió del test objetivo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {discrepancies.map(d => {
                const isHigher = d.diff > 0
                return (
                  <div
                    key={d.mood.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border bg-muted/20"
                  >
                    <div className={cn(
                      "rounded-md p-1.5 shrink-0",
                      isHigher ? "bg-green-500/10" : "bg-amber-500/10",
                    )}>
                      {isHigher
                        ? <TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                        : <TrendingDown className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">
                        {isHigher ? "Te subestimaste" : "Te sobreestimaste"} ·{" "}
                        <span className="text-muted-foreground font-normal">
                          {getShortDate(d.mood.timestamp)}
                        </span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Slider: {d.mood.focus}/5 ({Math.round(d.sliderNorm)}/100) ·{" "}
                        Test objetivo: {d.objScore}/100
                      </p>
                    </div>
                    <span className={cn(
                      "text-sm font-bold tabular-nums shrink-0",
                      isHigher ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400",
                    )}>
                      {isHigher ? "+" : ""}{Math.round(d.diff)}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-3 italic">
              Una diferencia ≥25 puntos sugiere que tu autoevaluación no coincidió con tu desempeño real.
              Útil para calibrar autoconocimiento.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── Sub-componente: Stat card ───────────────────────────────────────────────

function StatCard({
  icon: Icon, label, value, sub, accent = "neutral",
}: {
  icon: typeof Activity
  label: string
  value: string
  sub?: string
  accent?: "good" | "bad" | "neutral"
}) {
  const accentColor = {
    good:    "text-green-600 dark:text-green-400",
    bad:     "text-red-600 dark:text-red-400",
    neutral: "text-foreground",
  }[accent]

  return (
    <Card>
      <CardContent className="p-3 md:p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className={cn("text-xl md:text-2xl font-bold tabular-nums leading-tight", accentColor)}>
          {value}
        </p>
        {sub && (
          <p className="text-[10px] md:text-xs text-muted-foreground leading-tight">{sub}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Sub-componente: Factor ranking ──────────────────────────────────────────

function FactorRanking({
  title, titleColor, items, totalMoods, barColor,
}: {
  title: string
  titleColor: string
  items: { id: string; count: number; def: typeof FACTOR_CATALOG[string] | undefined }[]
  totalMoods: number
  barColor: string
}) {
  const max = Math.max(...items.map(i => i.count), 1)
  return (
    <div className="space-y-1.5">
      <p className={cn("text-xs font-semibold uppercase tracking-wider", titleColor)}>
        {title}
      </p>
      <div className="space-y-1">
        {items.map(item => {
          const pct = Math.round((item.count / totalMoods) * 100)
          const widthPct = (item.count / max) * 100
          return (
            <div key={item.id} className="space-y-0.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="text-foreground/80 truncate">{item.def?.label}</span>
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {item.count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full transition-all rounded-full", barColor)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
