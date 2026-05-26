"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Mood } from "@/lib/types"
import {
  Frown, Meh, Smile, Laugh, Angry, Info,
  Moon, Activity, Volume2, HeartPulse,
  Plus, X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AiInfoBanner } from "@/components/ai-info-banner"
import { ConcentrationTest, type MiniTestResult } from "@/components/mood-mini-tests"

// ─── Props ────────────────────────────────────────────────────────────────────

interface MoodTrackerProps {
  onSubmit: (mood: Omit<Mood, "id" | "timestamp">) => void
}

// ─── Estado de ánimo (emojis) ────────────────────────────────────────────────

const moodOptions: Array<{
  value: Mood["mood"]
  label: string
  icon: typeof Smile
  color: string
}> = [
  { value: "muy-mal",   label: "Muy Mal",   icon: Angry, color: "text-red-600"     },
  { value: "mal",       label: "Mal",       icon: Frown, color: "text-orange-600"  },
  { value: "neutral",   label: "Neutral",   icon: Meh,   color: "text-yellow-600"  },
  { value: "bien",      label: "Bien",      icon: Smile, color: "text-green-600"   },
  { value: "excelente", label: "Excelente", icon: Laugh, color: "text-emerald-600" },
]

// ─── Información de escalas (para popover) ───────────────────────────────────

const SCALE_INFO = {
  energy: {
    title: "¿Cómo medir tu energía?",
    description: "Tu capacidad física y mental para afrontar tareas en este momento.",
    examples: [
      { value: "1/5", text: "Apenas puedo levantarme o mantener los ojos abiertos" },
      { value: "2/5", text: "Me muevo pero con esfuerzo; siento pesadez general" },
      { value: "3/5", text: "Normal, puedo trabajar pero sin impulso extra" },
      { value: "4/5", text: "Activo/a y con ganas de avanzar" },
      { value: "5/5", text: "Podría trabajar horas seguidas o salir a correr ahora" },
    ],
    tip: "No confundas energía con ánimo: puedes sentirte triste pero con energía física.",
  },
  focus: {
    title: "¿Cómo medir tu concentración?",
    description: "Qué tan fácil te resulta mantener la atención en una cosa sin distraerte.",
    examples: [
      { value: "1/5", text: "Me distraigo con cualquier sonido o pensamiento" },
      { value: "2/5", text: "Logro enfocarme pero pierdo el hilo cada pocos minutos" },
      { value: "3/5", text: "Concentración media: funciono pero no fluyo" },
      { value: "4/5", text: "Puedo sostener atención 20–30 min sin interrupciones" },
      { value: "5/5", text: "Estado de flow: pierdo noción del tiempo trabajando" },
    ],
    tip: "Puedes estar concentrado y estresado al mismo tiempo: son dimensiones independientes.",
  },
  stress: {
    title: "¿Cómo medir tu estrés?",
    description: "Qué tan abrumado o tenso te sientes ahora, física o mentalmente.",
    examples: [
      { value: "1/5", text: "Totalmente tranquilo/a, sin preocupaciones presentes" },
      { value: "2/5", text: "Leve tensión pero la manejo bien" },
      { value: "3/5", text: "Estrés moderado: noto presión pero puedo funcionar" },
      { value: "4/5", text: "Bastante estresado/a; me cuesta relajarme" },
      { value: "5/5", text: "Tensión física (cabeza, cuello), pensamientos acelerados" },
    ],
    tip: "El estrés varía según cada persona: calibra según tu propia experiencia habitual.",
  },
} as const

// ─── Factores contextuales (agrupados por dimensión que afectan) ─────────────
// Cada factor tiene polaridad para que la IA pueda interpretar el contexto:
//   + : impacto típicamente positivo en la dimensión
//   - : impacto típicamente negativo
//   ~ : impacto neutro / variable

type Polarity = "+" | "-" | "~"

interface ContextFactor { id: string; label: string; polarity: Polarity }
interface ContextGroup {
  id: string
  title: string
  icon: typeof Moon
  hint: string // qué dimensión afecta
  factors: ContextFactor[]
}

const CONTEXT_GROUPS: ContextGroup[] = [
  {
    id: "sueno",
    title: "Sueño",
    icon: Moon,
    hint: "Afecta energía y concentración",
    factors: [
      { id: "sleep-good",     label: "Dormí bien (7–8h)",      polarity: "+" },
      { id: "sleep-short",    label: "Dormí poco (<6h)",       polarity: "-" },
      { id: "sleep-broken",   label: "Sueño interrumpido",     polarity: "-" },
      { id: "sleep-nap",      label: "Tomé siesta hoy",        polarity: "~" },
    ],
  },
  {
    id: "cuerpo",
    title: "Cuerpo y alimentación",
    icon: Activity,
    hint: "Afecta principalmente energía",
    factors: [
      { id: "exercised",      label: "Hice ejercicio",         polarity: "+" },
      { id: "caffeine",       label: "Tomé cafeína",           polarity: "~" },
      { id: "ate-recently",   label: "Comí hace menos de 1h",  polarity: "~" },
      { id: "fasting",        label: "Llevo +4h sin comer",    polarity: "-" },
      { id: "feeling-unwell", label: "Malestar físico",        polarity: "-" },
    ],
  },
  {
    id: "entorno",
    title: "Entorno",
    icon: Volume2,
    hint: "Afecta principalmente concentración",
    factors: [
      { id: "quiet-space",    label: "Espacio silencioso",     polarity: "+" },
      { id: "noisy",          label: "Ruido o distracciones",  polarity: "-" },
      { id: "no-notifs",      label: "Notificaciones apagadas",polarity: "+" },
      { id: "interruptions",  label: "Interrupciones constantes", polarity: "-" },
    ],
  },
  {
    id: "mental",
    title: "Estado mental",
    icon: HeartPulse,
    hint: "Afecta estrés y ánimo",
    factors: [
      { id: "calm-day",       label: "Día tranquilo",          polarity: "+" },
      { id: "deadlines",      label: "Deadlines / urgencias",  polarity: "-" },
      { id: "good-news",      label: "Buena noticia reciente", polarity: "+" },
      { id: "conflict",       label: "Conflicto reciente",     polarity: "-" },
      { id: "multitask",      label: "Multitarea intensa",     polarity: "-" },
    ],
  },
]

// ─── Prompts de reflexión (reemplazan los chips simples) ─────────────────────
// Insertan starters estructurados en el textarea para guiar reflexión cuantificable.

const REFLECTION_PROMPTS = [
  { id: "helped",   label: "Me ayudó",        starter: "Lo que me ayudó: " },
  { id: "blocked",  label: "Me bloqueó",      starter: "Lo que me bloqueó: " },
  { id: "tomorrow", label: "Para mañana",     starter: "Para mañana quiero: " },
  { id: "pattern",  label: "Patrón observado",starter: "Noto un patrón: " },
]

// ─── Sub-componente: Info popover de escala (responsive + dark mode) ─────────

function ScaleInfo({ scaleKey }: { scaleKey: keyof typeof SCALE_INFO }) {
  const info = SCALE_INFO[scaleKey]
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Información sobre ${info.title}`}
          className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground
                     hover:text-primary hover:bg-muted transition-colors ml-1"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-[calc(100vw-2rem)] max-w-[340px] p-4 space-y-3"
      >
        <div className="space-y-1">
          <p className="font-semibold text-sm leading-tight">{info.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
        </div>
        <ul className="space-y-1.5">
          {info.examples.map(ex => (
            <li key={ex.value} className="text-xs flex gap-2 items-start">
              <span className="font-semibold shrink-0 text-primary tabular-nums w-7">{ex.value}</span>
              <span className="text-muted-foreground leading-relaxed">{ex.text}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-primary/90 border-t pt-2.5 leading-relaxed flex gap-1.5">
          <span>💡</span>
          <span>{info.tip}</span>
        </p>
      </PopoverContent>
    </Popover>
  )
}

// ─── Sub-componente: Grupo de factores contextuales (collapsible visual) ─────

function ContextGroupCard({
  group,
  selected,
  onToggle,
}: {
  group: ContextGroup
  selected: string[]
  onToggle: (id: string) => void
}) {
  const Icon = group.icon
  const selectedCount = group.factors.filter(f => selected.includes(f.id)).length

  return (
    <div className="rounded-lg border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="rounded-md bg-primary/10 p-1.5 shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">{group.title}</p>
            <p className="text-[11px] text-muted-foreground leading-tight">{group.hint}</p>
          </div>
        </div>
        {selectedCount > 0 && (
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
            {selectedCount}
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {group.factors.map(factor => {
          const isSelected = selected.includes(factor.id)
          return (
            <label
              key={factor.id}
              htmlFor={`factor-${factor.id}`}
              className={cn(
                "flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer select-none",
                "transition-colors border",
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "border-transparent hover:bg-muted/50",
              )}
            >
              <Checkbox
                id={`factor-${factor.id}`}
                checked={isSelected}
                onCheckedChange={() => onToggle(factor.id)}
                className="shrink-0"
              />
              <span
                className={cn(
                  "text-[11px] font-bold shrink-0 w-3.5 text-center",
                  factor.polarity === "+" && "text-green-600 dark:text-green-400",
                  factor.polarity === "-" && "text-red-600 dark:text-red-400",
                  factor.polarity === "~" && "text-muted-foreground",
                )}
                aria-hidden
              >
                {factor.polarity}
              </span>
              <span className="text-xs leading-tight flex-1">{factor.label}</span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────

export function MoodTracker({ onSubmit }: MoodTrackerProps) {
  const [selectedMood,       setSelectedMood]       = useState<Mood["mood"]>("neutral")
  const [energy,             setEnergy]             = useState([3])
  const [focus,              setFocus]              = useState([3])
  const [stress,             setStress]             = useState([3])
  const [notes,              setNotes]              = useState("")
  const [selectedFactors,    setSelectedFactors]    = useState<string[]>([])
  const [testResult,         setTestResult]         = useState<MiniTestResult | null>(null)
  const [lastTestId,         setLastTestId]         = useState<string | null>(null)
  const [testKey,            setTestKey]            = useState(0) // remount tras submit

  const toggleFactor = (id: string) => {
    setSelectedFactors(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id],
    )
  }

  const insertPrompt = (starter: string) => {
    const base = notes.trimEnd()
    const sep  = base.length > 0 && !base.endsWith("\n") ? "\n" : ""
    setNotes((base + sep + starter).slice(0, 300))
  }

  const removeFactor = (id: string) => {
    setSelectedFactors(prev => prev.filter(f => f !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Construir contextFactors con identificador del test cuando aplique,
    // para que la IA pueda diferenciar el tipo de medición objetiva.
    const factorsWithMeta: string[] = [...selectedFactors]
    if (testResult) {
      factorsWithMeta.push(`__test:${testResult.testId}`)
    }

    onSubmit({
      mood:               selectedMood,
      energy:             energy[0],
      focus:              focus[0],
      stress:             stress[0],
      notes:              notes.trim() || undefined,
      contextFactors:     factorsWithMeta.length > 0 ? factorsWithMeta : undefined,
      concentrationScore: testResult?.score,
    })

    // Reset y rotación de test
    setSelectedMood("neutral")
    setEnergy([3])
    setFocus([3])
    setStress([3])
    setNotes("")
    setSelectedFactors([])
    setLastTestId(testResult?.testId ?? null)
    setTestResult(null)
    setTestKey(k => k + 1)
  }

  // Lista de etiquetas visibles de factores seleccionados (sin meta __test:)
  const visibleFactorLabels = CONTEXT_GROUPS
    .flatMap(g => g.factors)
    .filter(f => selectedFactors.includes(f.id))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Estado de Ánimo</CardTitle>
        <CardDescription>Cuanta más información, mejor podrá la IA detectar tus patrones</CardDescription>
      </CardHeader>
      <CardContent>
        <AiInfoBanner
          variant="info"
          compact
          message="Tus registros se almacenan cifrados y son visibles solo para ti. Se usan para personalizar las recomendaciones de la IA. No se comparten con terceros."
          className="mb-4"
        />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── 1. Estado general ────────────────────────────────────── */}
          <div className="space-y-3">
            <Label>¿Cómo te sientes en general?</Label>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {moodOptions.map(option => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMood(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-4 rounded-lg border-2 transition-all hover:scale-105",
                      selectedMood === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-6 w-6 sm:h-8 sm:w-8",
                        selectedMood === option.value ? option.color : "text-muted-foreground",
                      )}
                    />
                    <span className="text-[10px] sm:text-xs font-medium leading-tight text-center">
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── 2. Escalas subjetivas ──────────────────────────────────── */}
          <SectionDivider>Cómo te percibes ahora</SectionDivider>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Energía</Label>
                <ScaleInfo scaleKey="energy" />
              </div>
              <span className="text-sm font-medium tabular-nums">{energy[0]}/5</span>
            </div>
            <Slider value={energy} onValueChange={setEnergy} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Agotado/a</span><span>Con mucha energía</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Concentración</Label>
                <ScaleInfo scaleKey="focus" />
              </div>
              <span className="text-sm font-medium tabular-nums">{focus[0]}/5</span>
            </div>
            <Slider value={focus} onValueChange={setFocus} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy distraído/a</span><span>Completamente enfocado/a</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Estrés</Label>
                <ScaleInfo scaleKey="stress" />
              </div>
              <span className="text-sm font-medium tabular-nums">{stress[0]}/5</span>
            </div>
            <Slider value={stress} onValueChange={setStress} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Relajado/a</span><span>Muy presionado/a</span>
            </div>
          </div>

          {/* ── 3. Medición objetiva (test rotativo) ───────────────────── */}
          <SectionDivider>Medición objetiva de concentración</SectionDivider>
          <p className="text-xs text-muted-foreground -mt-2">
            Un test breve y aleatorio en cada registro. El puntaje complementa tu slider subjetivo.
          </p>
          <ConcentrationTest
            key={testKey}
            onScore={setTestResult}
            excludeId={lastTestId}
          />

          {/* ── 4. Factores contextuales agrupados ─────────────────────── */}
          <SectionDivider>Contexto del momento</SectionDivider>
          <p className="text-xs text-muted-foreground -mt-2">
            Marca lo que aplique. Los signos (<span className="text-green-600 dark:text-green-400 font-bold">+</span>, <span className="text-red-600 dark:text-red-400 font-bold">−</span>, <span className="text-muted-foreground font-bold">~</span>) indican el impacto típico de cada factor.
          </p>

          <div className="grid gap-2.5">
            {CONTEXT_GROUPS.map(group => (
              <ContextGroupCard
                key={group.id}
                group={group}
                selected={selectedFactors}
                onToggle={toggleFactor}
              />
            ))}
          </div>

          {/* Chips de factores seleccionados (resumen visual) */}
          {visibleFactorLabels.length > 0 && (
            <div className="rounded-lg border border-dashed bg-muted/20 p-2.5 space-y-1.5">
              <p className="text-[11px] text-muted-foreground font-medium">
                Seleccionados ({visibleFactorLabels.length})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {visibleFactorLabels.map(f => (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary"
                  >
                    {f.label}
                    <button
                      type="button"
                      onClick={() => removeFactor(f.id)}
                      className="hover:bg-primary/20 rounded-full p-0.5"
                      aria-label={`Quitar ${f.label}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── 5. Reflexión (prompts estructurados) ───────────────────── */}
          <SectionDivider>Reflexión (opcional)</SectionDivider>

          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label htmlFor="notes" className="text-sm">
                Notas con contexto
              </Label>
              <span
                className={cn(
                  "text-xs tabular-nums",
                  notes.length >= 280
                    ? notes.length >= 300 ? "text-destructive" : "text-orange-500"
                    : "text-muted-foreground",
                )}
              >
                {notes.length}/300
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Toca un prompt para insertar un comienzo estructurado:
            </p>

            <div className="flex flex-wrap gap-1.5">
              {REFLECTION_PROMPTS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => insertPrompt(p.starter)}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full
                             border border-border bg-muted/30 hover:bg-primary/10
                             hover:border-primary/50 hover:text-primary transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  {p.label}
                </button>
              ))}
            </div>

            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="Describe lo que está pasando con tu propio contexto. Cuanto más concreto, mejor podrá la IA detectar patrones."
              rows={4}
              maxLength={300}
            />
          </div>

          <Button type="submit" className="w-full">
            Guardar Registro
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// ─── Helpers visuales ────────────────────────────────────────────────────────

function SectionDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <div className="flex-1 h-px bg-border" />
      <span className="text-xs text-muted-foreground font-medium px-2 uppercase tracking-wider">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}
