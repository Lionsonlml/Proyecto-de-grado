"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { Mood } from "@/lib/types"
import { Frown, Meh, Smile, Laugh, Angry, Info, Brain, CheckCircle2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiInfoBanner } from "@/components/ai-info-banner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MoodTrackerProps {
  onSubmit: (mood: Omit<Mood, "id" | "timestamp">) => void
}

// ─── Mood options ─────────────────────────────────────────────────────────────

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

// ─── Scale info (disclaimers + examples) ─────────────────────────────────────

const SCALE_INFO = {
  energy: {
    title: "¿Cómo medir tu energía?",
    description: "Piensa en tu capacidad física y mental para afrontar tareas ahora mismo.",
    examples: [
      { value: "1/5", text: "Apenas puedo levantarme o mantener los ojos abiertos" },
      { value: "2/5", text: "Me muevo pero con esfuerzo; siento pesadez general" },
      { value: "3/5", text: "Normal, puedo trabajar pero sin impulso extra" },
      { value: "4/5", text: "Activo/a y con ganas de avanzar" },
      { value: "5/5", text: "Podría trabajar horas seguidas o salir a correr ahora mismo" },
    ],
    tip: "💡 No confundas energía con ánimo — puedes sentirte triste pero con energía física.",
  },
  focus: {
    title: "¿Cómo medir tu concentración?",
    description: "Qué tan fácil te resulta mantener la atención en una sola cosa sin distraerte.",
    examples: [
      { value: "1/5", text: "Me distraigo con cualquier sonido o pensamiento" },
      { value: "2/5", text: "Logro enfocarme pero pierdo el hilo cada pocos minutos" },
      { value: "3/5", text: "Concentración media: funciono pero no fluyo" },
      { value: "4/5", text: "Puedo sostener atención 20–30 min sin interrupciones" },
      { value: "5/5", text: "Estado de flow: pierdo noción del tiempo mientras trabajo" },
    ],
    tip: "💡 Puedes estar concentrado y estresado al mismo tiempo — son dimensiones independientes.",
  },
  stress: {
    title: "¿Cómo medir tu estrés?",
    description: "Qué tan abrumado o tenso te sientes ahora mismo, física o mentalmente.",
    examples: [
      { value: "1/5", text: "Totalmente tranquilo/a, sin preocupaciones presentes" },
      { value: "2/5", text: "Leve tensión pero la manejo bien" },
      { value: "3/5", text: "Estrés moderado: noto presión pero puedo funcionar" },
      { value: "4/5", text: "Bastante estresado/a; me cuesta relajarme" },
      { value: "5/5", text: "Muy alto: tensión física (cabeza, cuello), pensamientos acelerados" },
    ],
    tip: "💡 El estrés varía según cada persona — calibra en función de tu propia experiencia habitual.",
  },
} as const

// ─── Context factors ──────────────────────────────────────────────────────────

const CONTEXT_FACTORS = [
  { id: "slept-poorly",    label: "Dormí mal"                  },
  { id: "had-coffee",      label: "Tomé café"                  },
  { id: "exercised",       label: "Ejercité hoy"               },
  { id: "heavy-workload",  label: "Mucha carga de trabajo"     },
  { id: "personal-issues", label: "Problemas personales"       },
  { id: "external-noise",  label: "Ruido / distracciones"      },
  { id: "hungry",          label: "Comí hace poco"             },
  { id: "feeling-unwell",  label: "Me siento mal físicamente"  },
]

// ─── Note chips ───────────────────────────────────────────────────────────────

const NOTE_CHIPS = ["Trabajo", "Salud", "Sueño", "Relaciones", "Universidad", "Personal"]

// ─── Stroop test data ─────────────────────────────────────────────────────────

const STROOP_PALETTE = [
  { word: "ROJO",     inkHex: "#3b82f6", inkName: "Azul"     },
  { word: "AZUL",     inkHex: "#22c55e", inkName: "Verde"    },
  { word: "VERDE",    inkHex: "#ef4444", inkName: "Rojo"     },
  { word: "AMARILLO", inkHex: "#a855f7", inkName: "Morado"   },
  { word: "MORADO",   inkHex: "#f97316", inkName: "Naranja"  },
  { word: "NARANJA",  inkHex: "#eab308", inkName: "Amarillo" },
]

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

type StroopItem = {
  word: string
  inkHex: string
  inkName: string
  options: { name: string; hex: string }[]
}

function buildStroopItems(): StroopItem[] {
  return shuffle(STROOP_PALETTE).slice(0, 5).map(item => ({
    ...item,
    options: shuffle([
      { name: item.inkName, hex: item.inkHex },
      ...shuffle(STROOP_PALETTE.filter(c => c.inkName !== item.inkName))
        .slice(0, 3)
        .map(c => ({ name: c.inkName, hex: c.inkHex })),
    ]),
  }))
}

// ─── Sub-component: Scale info tooltip ───────────────────────────────────────

function ScaleInfoTooltip({ scaleKey }: { scaleKey: keyof typeof SCALE_INFO }) {
  const info = SCALE_INFO[scaleKey]
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`Información sobre ${scaleKey}`}
            className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors ml-1"
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-[270px] p-3 space-y-2 z-50">
          <p className="font-semibold text-sm">{info.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{info.description}</p>
          <ul className="space-y-1">
            {info.examples.map(ex => (
              <li key={ex.value} className="text-xs flex gap-1.5 items-start">
                <span className="font-semibold shrink-0 text-primary">{ex.value}</span>
                <span className="text-muted-foreground">{ex.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-primary/80 border-t pt-2 leading-relaxed">{info.tip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ─── Sub-component: Stroop test ───────────────────────────────────────────────

type StroopPhase = "idle" | "running" | "done"

function StroopTest({ onScore }: { onScore: (score: number) => void }) {
  const [phase, setPhase]         = useState<StroopPhase>("idle")
  const [items, setItems]         = useState<StroopItem[]>([])
  const [idx, setIdx]             = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback]   = useState<"correct" | "wrong" | null>(null)
  const [finalScore, setFinalScore] = useState<number | null>(null)

  const start = () => {
    setItems(buildStroopItems())
    setIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setFinalScore(null)
    setPhase("running")
  }

  const handleAnswer = (optionName: string) => {
    if (feedback !== null) return // evitar doble clic durante animación

    const current = items[idx]
    const isCorrect = optionName === current.inkName
    const newCorrect = correctCount + (isCorrect ? 1 : 0)

    setFeedback(isCorrect ? "correct" : "wrong")

    setTimeout(() => {
      setFeedback(null)
      if (idx + 1 >= items.length) {
        const score = Math.round((newCorrect / items.length) * 100)
        setCorrectCount(newCorrect)
        setFinalScore(score)
        setPhase("done")
        onScore(score)
      } else {
        setCorrectCount(newCorrect)
        setIdx(i => i + 1)
      }
    }, 550)
  }

  const scoreLabel = (s: number) =>
    s >= 80
      ? { text: "Concentración alta",  color: "text-green-600"  }
      : s >= 60
      ? { text: "Concentración media", color: "text-yellow-600" }
      : { text: "Concentración baja",  color: "text-red-600"    }

  // ── idle ──
  if (phase === "idle") {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Test objetivo de concentración</p>
            <p className="text-xs text-muted-foreground">
              5 preguntas · ~25 segundos · Mide tu concentración real ahora mismo
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Verás una palabra en un color de tinta. Selecciona el{" "}
              <strong>color de la tinta</strong>, no lo que dice la palabra.
              El puntaje se guarda junto a tu registro para enriquecer el análisis de la IA.
            </p>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={start} className="w-full">
          Iniciar mini-test Stroop
        </Button>
      </div>
    )
  }

  // ── done ──
  if (phase === "done") {
    const label = scoreLabel(finalScore!)
    return (
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Test completado</span>
          </div>
          <button
            type="button"
            onClick={start}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Repetir
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold tabular-nums">{finalScore}/100</span>
          <span className={cn("text-sm font-medium", label.color)}>{label.text}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {correctCount}/{items.length} respuestas correctas · Puntaje guardado con el registro
        </p>
      </div>
    )
  }

  // ── running ──
  const current = items[idx]
  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Header: progress bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium flex items-center gap-1.5">
          <Brain className="h-3.5 w-3.5" />
          Pregunta {idx + 1} de {items.length}
        </span>
        <div className="flex gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-5 rounded-full transition-colors",
                i < idx       ? "bg-primary"
                : i === idx   ? "bg-primary/50"
                : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        ¿Cuál es el <strong>color de la tinta</strong>? (ignora lo que dice la palabra)
      </p>

      {/* Word display */}
      <div
        className={cn(
          "text-center text-3xl font-black tracking-widest py-5 rounded-lg transition-colors select-none",
          feedback === "correct" && "bg-green-500/10",
          feedback === "wrong"   && "bg-red-500/10",
          !feedback              && "bg-muted/30",
        )}
        style={{ color: current.inkHex }}
      >
        {current.word}
      </div>

      {/* Answer buttons */}
      <div className="grid grid-cols-2 gap-2">
        {current.options.map(opt => (
          <button
            key={opt.name}
            type="button"
            onClick={() => handleAnswer(opt.name)}
            disabled={feedback !== null}
            className={cn(
              "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium",
              "transition-all hover:border-primary/60 hover:bg-muted/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            <span
              className="inline-block h-4 w-4 rounded-full shrink-0 border border-black/10 dark:border-white/10"
              style={{ background: opt.hex }}
            />
            {opt.name}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MoodTracker({ onSubmit }: MoodTrackerProps) {
  const [selectedMood,       setSelectedMood]       = useState<Mood["mood"]>("neutral")
  const [energy,             setEnergy]             = useState([3])
  const [focus,              setFocus]              = useState([3])
  const [stress,             setStress]             = useState([3])
  const [notes,              setNotes]              = useState("")
  const [selectedFactors,    setSelectedFactors]    = useState<string[]>([])
  const [concentrationScore, setConcentrationScore] = useState<number | undefined>(undefined)

  const toggleFactor = (id: string) => {
    setSelectedFactors(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id],
    )
  }

  const appendChip = (chip: string) => {
    const base      = notes.trimEnd()
    const separator = base.length > 0 ? " " : ""
    setNotes((base + separator + chip).slice(0, 300))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      mood:               selectedMood,
      energy:             energy[0],
      focus:              focus[0],
      stress:             stress[0],
      notes:              notes.trim() || undefined,
      contextFactors:     selectedFactors.length > 0 ? selectedFactors : undefined,
      concentrationScore,
    })
    // Reset
    setSelectedMood("neutral")
    setEnergy([3])
    setFocus([3])
    setStress([3])
    setNotes("")
    setSelectedFactors([])
    setConcentrationScore(undefined)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Estado de Ánimo</CardTitle>
        <CardDescription>Registra cómo te sientes en este momento</CardDescription>
      </CardHeader>
      <CardContent>
        <AiInfoBanner
          variant="info"
          compact
          message="Tus registros se almacenan cifrados y son visibles solo para ti. Se usan para personalizar las recomendaciones de la IA. No se comparten con terceros."
          className="mb-4"
        />

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ── Estado general ─────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label>¿Cómo te sientes?</Label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map(option => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMood(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105",
                      selectedMood === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-8 w-8",
                        selectedMood === option.value
                          ? option.color
                          : "text-muted-foreground",
                      )}
                    />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── Separador ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">
              Escalas de medición
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Energía ────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Energía</Label>
                <ScaleInfoTooltip scaleKey="energy" />
              </div>
              <span className="text-sm font-medium tabular-nums">{energy[0]}/5</span>
            </div>
            <Slider
              value={energy}
              onValueChange={setEnergy}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Agotado/a</span>
              <span>Con mucha energía</span>
            </div>
          </div>

          {/* ── Concentración ──────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Concentración</Label>
                <ScaleInfoTooltip scaleKey="focus" />
              </div>
              <span className="text-sm font-medium tabular-nums">{focus[0]}/5</span>
            </div>
            <Slider
              value={focus}
              onValueChange={setFocus}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy distraído/a</span>
              <span>Completamente enfocado/a</span>
            </div>
          </div>

          {/* ── Estrés ─────────────────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Label>Nivel de Estrés</Label>
                <ScaleInfoTooltip scaleKey="stress" />
              </div>
              <span className="text-sm font-medium tabular-nums">{stress[0]}/5</span>
            </div>
            <Slider
              value={stress}
              onValueChange={setStress}
              min={1}
              max={5}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Relajado/a</span>
              <span>Muy presionado/a</span>
            </div>
          </div>

          {/* ── Separador ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">
              Medición objetiva
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Test de Stroop ─────────────────────────────────────────── */}
          <StroopTest onScore={setConcentrationScore} />

          {/* ── Separador ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium px-2">
              Factores contextuales
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* ── Factores contextuales ──────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              ¿Qué puede estar influyendo en tu estado hoy?
            </Label>
            <p className="text-xs text-muted-foreground -mt-1">
              Esta información ayuda a la IA a contextualizar mejor tus patrones.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {CONTEXT_FACTORS.map(factor => (
                <div key={factor.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`factor-${factor.id}`}
                    checked={selectedFactors.includes(factor.id)}
                    onCheckedChange={() => toggleFactor(factor.id)}
                  />
                  <label
                    htmlFor={`factor-${factor.id}`}
                    className="text-sm cursor-pointer select-none leading-tight"
                  >
                    {factor.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* ── Notas ──────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="notes">Notas (opcional)</Label>
              {notes.length > 200 && (
                <span
                  className={cn(
                    "text-xs",
                    notes.length >= 300 ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {notes.length}/300
                </span>
              )}
            </div>

            {/* Chips de sugerencia */}
            <div className="flex flex-wrap gap-1.5">
              {NOTE_CHIPS.map(chip => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => appendChip(chip)}
                  className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/50
                             hover:bg-primary/10 hover:border-primary/50 hover:text-primary
                             transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>

            <Textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value.slice(0, 300))}
              placeholder="¿Qué está afectando tu estado de ánimo?"
              rows={3}
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
