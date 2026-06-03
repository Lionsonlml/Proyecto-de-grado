"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Mood } from "@/lib/types"
import {
  Frown, Meh, Smile, Laugh, Angry,
  Battery, Focus, Zap,
  ChevronDown, ChevronUp,
  Brain, Moon, Activity, Volume2, HeartPulse,
  Layers, Eye, Calculator, Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatBogotaShortDate, formatBogotaTime, parseDbTimestamp } from "@/lib/timezone"

interface MoodHistoryProps {
  moods: Mood[]
}

const moodConfig = {
  "muy-mal":   { label: "Muy Mal",   icon: Angry, color: "text-red-600 bg-red-50 dark:bg-red-950"            },
  mal:         { label: "Mal",       icon: Frown, color: "text-orange-600 bg-orange-50 dark:bg-orange-950"   },
  neutral:     { label: "Neutral",   icon: Meh,   color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950"   },
  bien:        { label: "Bien",      icon: Smile, color: "text-green-600 bg-green-50 dark:bg-green-950"      },
  excelente:   { label: "Excelente", icon: Laugh, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950"},
}

// ─── Catálogo de factores contextuales (espejo del MoodTracker) ──────────────
// Permite expandir el id guardado en BD a su etiqueta legible + categoría + polaridad

type Polarity = "+" | "-" | "~"

const FACTOR_CATALOG: Record<string, { label: string; group: string; icon: typeof Moon; polarity: Polarity }> = {
  // Sueño
  "sleep-good":      { label: "Dormí bien (7–8h)",      group: "Sueño",     icon: Moon,       polarity: "+" },
  "sleep-short":     { label: "Dormí poco (<6h)",       group: "Sueño",     icon: Moon,       polarity: "-" },
  "sleep-broken":    { label: "Sueño interrumpido",     group: "Sueño",     icon: Moon,       polarity: "-" },
  "sleep-nap":       { label: "Tomé siesta hoy",        group: "Sueño",     icon: Moon,       polarity: "~" },
  // Cuerpo
  "exercised":       { label: "Hice ejercicio",         group: "Cuerpo",    icon: Activity,   polarity: "+" },
  "caffeine":        { label: "Tomé cafeína",           group: "Cuerpo",    icon: Activity,   polarity: "~" },
  "ate-recently":    { label: "Comí hace menos de 1h",  group: "Cuerpo",    icon: Activity,   polarity: "~" },
  "fasting":         { label: "Llevo +4h sin comer",    group: "Cuerpo",    icon: Activity,   polarity: "-" },
  "feeling-unwell":  { label: "Malestar físico",        group: "Cuerpo",    icon: Activity,   polarity: "-" },
  // Entorno
  "quiet-space":     { label: "Espacio silencioso",     group: "Entorno",   icon: Volume2,    polarity: "+" },
  "noisy":           { label: "Ruido o distracciones",  group: "Entorno",   icon: Volume2,    polarity: "-" },
  "no-notifs":       { label: "Notificaciones apagadas",group: "Entorno",   icon: Volume2,    polarity: "+" },
  "interruptions":   { label: "Interrupciones constantes", group: "Entorno",icon: Volume2,    polarity: "-" },
  // Mental
  "calm-day":        { label: "Día tranquilo",          group: "Mental",    icon: HeartPulse, polarity: "+" },
  "deadlines":       { label: "Deadlines / urgencias",  group: "Mental",    icon: HeartPulse, polarity: "-" },
  "good-news":       { label: "Buena noticia reciente", group: "Mental",    icon: HeartPulse, polarity: "+" },
  "conflict":        { label: "Conflicto reciente",     group: "Mental",    icon: HeartPulse, polarity: "-" },
  "multitask":       { label: "Multitarea intensa",     group: "Mental",    icon: HeartPulse, polarity: "-" },
}

const TEST_CATALOG: Record<string, { name: string; icon: typeof Brain; description: string }> = {
  "stroop":        { name: "Stroop",                icon: Layers,     description: "Inhibición y atención selectiva" },
  "memory":        { name: "Memoria de Trabajo",    icon: Brain,      description: "Memoria a corto plazo" },
  "visual-search": { name: "Búsqueda Visual",       icon: Eye,        description: "Atención selectiva visual"       },
  "math":          { name: "Atención Numérica",     icon: Calculator, description: "Cálculo bajo presión"            },
}

// ─── Interpretadores de niveles ──────────────────────────────────────────────

function interpretEnergy(v: number): string {
  if (v <= 1) return "Energía muy baja — necesitas descanso o nutrición"
  if (v === 2) return "Energía baja — esfuerzo notable para tareas exigentes"
  if (v === 3) return "Energía media — funcional, pero sin impulso extra"
  if (v === 4) return "Energía alta — buena disposición para avanzar"
  return "Energía muy alta — pico de productividad disponible"
}

function interpretFocus(v: number): string {
  if (v <= 1) return "Distracción constante — difícil sostener atención"
  if (v === 2) return "Atención dispersa — pierdes el hilo a menudo"
  if (v === 3) return "Concentración media — funcionas, pero sin flow"
  if (v === 4) return "Buena concentración — sostienes 20–30 min sin interrupciones"
  return "Concentración profunda — estado de flow"
}

function interpretStress(v: number): string {
  if (v <= 1) return "Muy relajado/a — sin presión presente"
  if (v === 2) return "Tensión leve, manejable"
  if (v === 3) return "Estrés moderado — funcional pero notable"
  if (v === 4) return "Estrés alto — cuesta relajarse"
  return "Estrés muy alto — tensión física y mental significativa"
}

function compareTestVsSlider(score: number, focusSlider: number): { label: string; color: string } {
  // Score (0-100) vs slider (1-5). Normalizamos slider a 0-100: (slider/5)*100
  const sliderNorm = (focusSlider / 5) * 100
  const diff = score - sliderNorm
  if (Math.abs(diff) <= 15) {
    return { label: "Coincide con tu percepción", color: "text-muted-foreground" }
  }
  if (diff > 15) {
    return { label: "Mejor de lo que percibías", color: "text-green-600 dark:text-green-400" }
  }
  return { label: "Por debajo de tu percepción", color: "text-amber-600 dark:text-amber-400" }
}

// ─── Sub-componente: chip de factor ───────────────────────────────────────────

function FactorChip({ id }: { id: string }) {
  const def = FACTOR_CATALOG[id]
  if (!def) {
    return (
      <span className="inline-flex items-center text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
        {id}
      </span>
    )
  }
  const Icon = def.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full border",
        def.polarity === "+" && "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400",
        def.polarity === "-" && "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400",
        def.polarity === "~" && "bg-muted border-border text-muted-foreground",
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      <span className="font-bold tabular-nums">{def.polarity}</span>
      {def.label}
    </span>
  )
}

// ─── Sub-componente: detalles expandibles ────────────────────────────────────

function MoodDetails({ mood }: { mood: Mood }) {
  const factors = mood.contextFactors ?? []

  // Separar test meta del resto
  const testId = factors.find(f => f.startsWith("__test:"))?.slice("__test:".length)
  const realFactors = factors.filter(f => !f.startsWith("__test:"))

  // Agrupar factores por categoría
  const grouped = realFactors.reduce<Record<string, string[]>>((acc, id) => {
    const cat = FACTOR_CATALOG[id]?.group ?? "Otros"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(id)
    return acc
  }, {})

  const testDef    = testId ? TEST_CATALOG[testId] : null
  const TestIcon   = testDef?.icon ?? Brain
  const comparison = mood.concentrationScore != null
    ? compareTestVsSlider(mood.concentrationScore, mood.focus)
    : null

  return (
    <div className="mt-3 pt-3 border-t space-y-3.5 text-sm">

      {/* ── Niveles con interpretación ───────────────────────────────── */}
      <div className="space-y-2">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Por qué estos niveles
        </h5>
        <div className="grid gap-1.5">
          <MetricRow icon={Battery} label="Energía"        value={mood.energy} text={interpretEnergy(mood.energy)} color="text-amber-600 dark:text-amber-400" />
          <MetricRow icon={Focus}   label="Concentración"  value={mood.focus}  text={interpretFocus(mood.focus)}   color="text-indigo-600 dark:text-indigo-400" />
          <MetricRow icon={Zap}     label="Estrés"         value={mood.stress} text={interpretStress(mood.stress)} color="text-red-600 dark:text-red-400" />
        </div>
      </div>

      {/* ── Resultado del test objetivo ──────────────────────────────── */}
      {mood.concentrationScore != null && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <TestIcon className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold">
                Test objetivo · {testDef?.name ?? "Concentración"}
              </span>
            </div>
            <span className="text-lg font-bold tabular-nums">{mood.concentrationScore}/100</span>
          </div>
          {testDef && (
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {testDef.description}
            </p>
          )}
          {comparison && (
            <p className={cn("text-xs font-medium flex items-center gap-1.5", comparison.color)}>
              <Sparkles className="h-3 w-3" />
              {comparison.label}
            </p>
          )}
        </div>
      )}

      {/* ── Factores contextuales ────────────────────────────────────── */}
      {Object.keys(grouped).length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Factores contextuales ({realFactors.length})
          </h5>
          <div className="space-y-2">
            {Object.entries(grouped).map(([group, ids]) => (
              <div key={group} className="space-y-1">
                <p className="text-[11px] font-medium text-muted-foreground">{group}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ids.map(id => <FactorChip key={id} id={id} />)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Reflexión completa del usuario ───────────────────────────── */}
      {mood.notes && (
        <div className="space-y-1.5">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Tu reflexión
          </h5>
          <p className="text-sm text-foreground/90 italic leading-relaxed whitespace-pre-line bg-muted/30 rounded-md p-2.5 border">
            {mood.notes}
          </p>
        </div>
      )}

      {/* Si no hay nada extra, mensaje informativo */}
      {!mood.concentrationScore && realFactors.length === 0 && !mood.notes && (
        <p className="text-xs text-muted-foreground italic">
          Este registro no incluye test objetivo ni factores contextuales adicionales.
        </p>
      )}
    </div>
  )
}

function MetricRow({
  icon: Icon, label, value, text, color,
}: {
  icon: typeof Battery; label: string; value: number; text: string; color: string
}) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", color)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5">
          <span className="font-semibold">{label}</span>
          <span className="text-muted-foreground tabular-nums">{value}/5</span>
        </div>
        <p className="text-muted-foreground leading-relaxed">{text}</p>
      </div>
    </div>
  )
}

// ─── Componente principal ───────────────────────────────────────────────────

export function MoodHistory({ moods }: MoodHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sortedMoods = [...moods].sort(
    (a, b) => parseDbTimestamp(b.timestamp).getTime() - parseDbTimestamp(a.timestamp).getTime(),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Estados</CardTitle>
        <CardDescription>
          Tus últimos registros — toca cualquiera para ver el detalle completo
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sortedMoods.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay registros aún</p>
        ) : (
          <div className="space-y-3">
            {sortedMoods.slice(0, 10).map(mood => {
              const config = moodConfig[mood.mood]
              const Icon = config.icon
              const isExpanded = expandedId === mood.id

              const factorCount = (mood.contextFactors ?? []).filter(f => !f.startsWith("__test:")).length
              const hasExtra = factorCount > 0 || mood.concentrationScore != null || !!mood.notes

              return (
                <div
                  key={mood.id}
                  className={cn(
                    "rounded-lg border bg-card transition-shadow",
                    isExpanded ? "shadow-md" : "hover:shadow-md",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : mood.id)}
                    className="w-full flex items-start gap-3 sm:gap-4 p-3 sm:p-4 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div className={cn("p-2.5 sm:p-3 rounded-full shrink-0", config.color)}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold">{config.label}</h4>
                        <span className="text-xs sm:text-sm text-muted-foreground">
                          {formatBogotaShortDate(mood.timestamp)} ·{" "}
                          {formatBogotaTime(mood.timestamp)}
                        </span>
                      </div>

                      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Battery className="h-3 w-3" />
                          Energía {mood.energy}/5
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Focus className="h-3 w-3" />
                          Concentración {mood.focus}/5
                        </Badge>
                        <Badge variant="secondary" className="gap-1 text-[11px]">
                          <Zap className="h-3 w-3" />
                          Estrés {mood.stress}/5
                        </Badge>
                        {mood.concentrationScore != null && (
                          <Badge variant="outline" className="gap-1 text-[11px] border-primary/30 text-primary">
                            <Brain className="h-3 w-3" />
                            Test {mood.concentrationScore}/100
                          </Badge>
                        )}
                        {factorCount > 0 && (
                          <Badge variant="outline" className="gap-1 text-[11px]">
                            {factorCount} factor{factorCount !== 1 ? "es" : ""}
                          </Badge>
                        )}
                      </div>

                      {!isExpanded && mood.notes && (
                        <p className="text-xs text-muted-foreground italic line-clamp-1">
                          {mood.notes}
                        </p>
                      )}
                    </div>

                    <span className="text-muted-foreground shrink-0 mt-2">
                      {isExpanded
                        ? <ChevronUp className="h-4 w-4" />
                        : <ChevronDown className="h-4 w-4" />
                      }
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                      <MoodDetails mood={mood} />
                    </div>
                  )}

                  {!isExpanded && !hasExtra && (
                    <p className="px-4 pb-3 text-[11px] text-muted-foreground italic">
                      Solo niveles registrados — sin factores adicionales
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
