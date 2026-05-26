"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Brain, CheckCircle2, RefreshCw, Shuffle, Eye, Calculator, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface MiniTestResult {
  score: number       // 0-100
  testId: string      // Identificador del test
  testName: string    // Nombre legible
}

interface MiniTestProps {
  onComplete: (result: MiniTestResult) => void
}

type Phase = "idle" | "running" | "done"

// ─── Utility ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

function scoreLabel(s: number) {
  return s >= 80
    ? { text: "Resultado: alto",  color: "text-green-600 dark:text-green-400"   }
    : s >= 60
    ? { text: "Resultado: medio", color: "text-yellow-600 dark:text-yellow-400" }
    : { text: "Resultado: bajo",  color: "text-red-600 dark:text-red-400"       }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1: STROOP (inhibición / atención selectiva)
// ═════════════════════════════════════════════════════════════════════════════

const STROOP_PALETTE = [
  { word: "ROJO",     inkHex: "#3b82f6", inkName: "Azul"     },
  { word: "AZUL",     inkHex: "#22c55e", inkName: "Verde"    },
  { word: "VERDE",    inkHex: "#ef4444", inkName: "Rojo"     },
  { word: "AMARILLO", inkHex: "#a855f7", inkName: "Morado"   },
  { word: "MORADO",   inkHex: "#f97316", inkName: "Naranja"  },
  { word: "NARANJA",  inkHex: "#eab308", inkName: "Amarillo" },
]

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

function StroopTestBody({ onComplete }: MiniTestProps) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [items, setItems] = useState<StroopItem[]>([])
  const [idx, setIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null)

  const start = () => {
    setItems(buildStroopItems())
    setIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setPhase("running")
  }

  const handleAnswer = (optionName: string) => {
    if (feedback !== null) return
    const isCorrect = optionName === items[idx].inkName
    const newCorrect = correctCount + (isCorrect ? 1 : 0)
    setFeedback(isCorrect ? "correct" : "wrong")

    setTimeout(() => {
      setFeedback(null)
      if (idx + 1 >= items.length) {
        const score = Math.round((newCorrect / items.length) * 100)
        setPhase("done")
        onComplete({ score, testId: "stroop", testName: "Stroop" })
      } else {
        setCorrectCount(newCorrect)
        setIdx(i => i + 1)
      }
    }, 550)
  }

  if (phase === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start} className="w-full">
        Iniciar test
      </Button>
    )
  }

  if (phase === "done") return null

  const current = items[idx]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Pregunta {idx + 1} / {items.length}</span>
        <div className="flex gap-1">
          {items.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i < idx     ? "bg-primary"
                : i === idx ? "bg-primary/50"
                : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        ¿Cuál es el <strong>color de la tinta</strong>?
      </p>

      <div
        className={cn(
          "text-center text-2xl sm:text-3xl font-black tracking-widest py-5 rounded-lg select-none transition-colors",
          feedback === "correct" && "bg-green-500/15",
          feedback === "wrong"   && "bg-red-500/15",
          !feedback              && "bg-muted/40",
        )}
        style={{ color: current.inkHex }}
      >
        {current.word}
      </div>

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

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2: MEMORY SPAN (memoria de trabajo)
// ═════════════════════════════════════════════════════════════════════════════

function MemoryTestBody({ onComplete }: MiniTestProps) {
  type MPhase = "idle" | "showing" | "input" | "feedback"
  const SEQ_LEN = 5

  const [phase, setPhase] = useState<MPhase>("idle")
  const [sequence, setSequence] = useState<number[]>([])
  const [displayIdx, setDisplayIdx] = useState(-1)
  const [userInput, setUserInput] = useState<number[]>([])

  // Mostrar números secuencialmente
  useEffect(() => {
    if (phase !== "showing") return
    if (displayIdx >= sequence.length - 1) {
      const t = setTimeout(() => {
        setDisplayIdx(-1)
        setPhase("input")
      }, 900)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setDisplayIdx(i => i + 1), 900)
    return () => clearTimeout(t)
  }, [phase, displayIdx, sequence.length])

  const start = () => {
    const seq = Array.from({ length: SEQ_LEN }, () => Math.floor(Math.random() * 9) + 1)
    setSequence(seq)
    setUserInput([])
    setDisplayIdx(0)
    setPhase("showing")
  }

  const handleDigit = (d: number) => {
    if (phase !== "input") return
    const next = [...userInput, d]
    setUserInput(next)
    if (next.length >= sequence.length) {
      const correct = next.filter((v, i) => v === sequence[i]).length
      const score = Math.round((correct / sequence.length) * 100)
      setPhase("feedback")
      setTimeout(() => {
        onComplete({ score, testId: "memory", testName: "Memoria de Trabajo" })
      }, 400)
    }
  }

  if (phase === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start} className="w-full">
        Iniciar test
      </Button>
    )
  }

  if (phase === "showing") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-center text-muted-foreground">
          Memoriza los números en orden
        </p>
        <div className="bg-muted/40 rounded-lg py-8 flex items-center justify-center">
          <span className="text-6xl font-bold tabular-nums text-primary">
            {displayIdx >= 0 && displayIdx < sequence.length ? sequence[displayIdx] : ""}
          </span>
        </div>
        <div className="flex gap-1 justify-center">
          {sequence.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i <= displayIdx ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
    )
  }

  // input or feedback
  return (
    <div className="space-y-3">
      <p className="text-xs text-center text-muted-foreground">
        Toca los números en el mismo orden que viste
      </p>
      <div className="bg-muted/40 rounded-lg py-3 px-4 min-h-[3rem] flex items-center justify-center gap-2">
        {userInput.length === 0 ? (
          <span className="text-sm text-muted-foreground">Tu respuesta aparecerá aquí</span>
        ) : (
          userInput.map((n, i) => (
            <span key={i} className="text-2xl font-bold tabular-nums text-primary">{n}</span>
          ))
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
          <button
            key={d}
            type="button"
            onClick={() => handleDigit(d)}
            disabled={phase !== "input"}
            className={cn(
              "py-3 rounded-lg border text-lg font-bold tabular-nums",
              "transition-all hover:border-primary/60 hover:bg-muted/50",
              "disabled:opacity-50 disabled:cursor-not-allowed",
            )}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3: VISUAL SEARCH (atención selectiva)
// ═════════════════════════════════════════════════════════════════════════════

function VisualSearchTestBody({ onComplete }: MiniTestProps) {
  const TOTAL_ROUNDS = 5
  const GRID_SIZE = 12 // 4 col x 3 fil
  const BASE_HUE = 240 // azul/índigo

  const [phase, setPhase] = useState<Phase>("idle")
  const [round, setRound] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<number | null>(null) // index clicked
  const [oddIdx, setOddIdx] = useState(0)

  const generateRound = (r: number) => {
    // Dificultad creciente: el "odd" tiene cada vez menos diferencia
    const lightDiff = Math.max(10, 35 - r * 5) // round 0: 35%, round 4: 15%
    setOddIdx(Math.floor(Math.random() * GRID_SIZE))
    return lightDiff
  }

  const [lightDiff, setLightDiff] = useState(35)

  const start = () => {
    setRound(0)
    setCorrectCount(0)
    setFeedback(null)
    setLightDiff(generateRound(0))
    setPhase("running")
  }

  const handleClick = (i: number) => {
    if (feedback !== null) return
    setFeedback(i)
    const isCorrect = i === oddIdx
    const newCorrect = correctCount + (isCorrect ? 1 : 0)
    setTimeout(() => {
      setFeedback(null)
      if (round + 1 >= TOTAL_ROUNDS) {
        const score = Math.round((newCorrect / TOTAL_ROUNDS) * 100)
        setPhase("done")
        onComplete({ score, testId: "visual-search", testName: "Búsqueda Visual" })
      } else {
        setCorrectCount(newCorrect)
        const nextRound = round + 1
        setRound(nextRound)
        setLightDiff(generateRound(nextRound))
      }
    }, 500)
  }

  if (phase === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start} className="w-full">
        Iniciar test
      </Button>
    )
  }

  if (phase === "done") return null

  const baseColor = `hsl(${BASE_HUE}, 75%, 55%)`
  const oddColor = `hsl(${BASE_HUE}, 75%, ${55 + lightDiff}%)`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Ronda {round + 1} / {TOTAL_ROUNDS}</span>
        <div className="flex gap-1">
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i < round    ? "bg-primary"
                : i === round ? "bg-primary/50"
                : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Toca el círculo que es <strong>ligeramente diferente</strong>
      </p>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 p-2 sm:p-3 bg-muted/30 rounded-lg">
        {Array.from({ length: GRID_SIZE }).map((_, i) => {
          const isOdd     = i === oddIdx
          const wasClick  = feedback === i
          const showRight = feedback !== null && isOdd
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(i)}
              disabled={feedback !== null}
              aria-label={`Círculo ${i + 1}`}
              className={cn(
                "aspect-square rounded-full transition-all",
                "hover:scale-105 active:scale-95",
                "disabled:cursor-not-allowed",
                showRight && "ring-2 ring-green-500 ring-offset-2 ring-offset-background",
                wasClick && !isOdd && "ring-2 ring-red-500 ring-offset-2 ring-offset-background",
              )}
              style={{ background: isOdd ? oddColor : baseColor }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4: MATH ATTENTION (atención sostenida + cálculo)
// ═════════════════════════════════════════════════════════════════════════════

type MathProblem = {
  a: number
  b: number
  op: "+" | "-"
  answer: number
  options: number[]
}

function generateMathProblems(n: number): MathProblem[] {
  return Array.from({ length: n }, () => {
    const a  = Math.floor(Math.random() * 12) + 2 // 2-13
    const b  = Math.floor(Math.random() * 9)  + 2 // 2-10
    const op = Math.random() > 0.5 ? "+" : "-"
    const answer = op === "+" ? a + b : Math.abs(a - b)

    const options = new Set<number>([answer])
    while (options.size < 4) {
      const delta = Math.floor(Math.random() * 9) - 4 // -4..+4
      const wrong = answer + delta
      if (wrong > 0 && wrong !== answer) options.add(wrong)
    }
    return { a, b, op, answer, options: shuffle(Array.from(options)) }
  })
}

function MathTestBody({ onComplete }: MiniTestProps) {
  const TOTAL = 5
  const [phase, setPhase] = useState<Phase>("idle")
  const [problems, setProblems] = useState<MathProblem[]>([])
  const [idx, setIdx] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [feedback, setFeedback] = useState<number | null>(null)

  const start = () => {
    setProblems(generateMathProblems(TOTAL))
    setIdx(0)
    setCorrectCount(0)
    setFeedback(null)
    setPhase("running")
  }

  const handleAnswer = (opt: number) => {
    if (feedback !== null) return
    const isCorrect = opt === problems[idx].answer
    const newCorrect = correctCount + (isCorrect ? 1 : 0)
    setFeedback(opt)

    setTimeout(() => {
      setFeedback(null)
      if (idx + 1 >= TOTAL) {
        const score = Math.round((newCorrect / TOTAL) * 100)
        setPhase("done")
        onComplete({ score, testId: "math", testName: "Atención Numérica" })
      } else {
        setCorrectCount(newCorrect)
        setIdx(i => i + 1)
      }
    }, 500)
  }

  if (phase === "idle") {
    return (
      <Button type="button" variant="outline" size="sm" onClick={start} className="w-full">
        Iniciar test
      </Button>
    )
  }

  if (phase === "done") return null

  const current = problems[idx]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Pregunta {idx + 1} / {TOTAL}</span>
        <div className="flex gap-1">
          {problems.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 w-4 rounded-full transition-colors",
                i < idx     ? "bg-primary"
                : i === idx ? "bg-primary/50"
                : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <div className="bg-muted/40 rounded-lg py-6 text-center select-none">
        <span className="text-3xl font-bold tabular-nums">
          {current.a} {current.op} {current.b} = <span className="text-primary">?</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {current.options.map(opt => {
          const isPicked  = feedback === opt
          const isCorrect = opt === current.answer
          const showRight = feedback !== null && isCorrect
          return (
            <button
              key={opt}
              type="button"
              onClick={() => handleAnswer(opt)}
              disabled={feedback !== null}
              className={cn(
                "py-3 rounded-lg border text-lg font-bold tabular-nums",
                "transition-all hover:border-primary/60 hover:bg-muted/50",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                showRight && "border-green-500 bg-green-500/10",
                isPicked && !isCorrect && "border-red-500 bg-red-500/10",
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ROUTER: selecciona un test aleatorio y maneja idle/done en un solo lugar
// ═════════════════════════════════════════════════════════════════════════════

const TEST_LIBRARY = [
  {
    id: "stroop",
    name: "Stroop",
    description: "Mide tu control de inhibición: identifica el color de la tinta ignorando lo que dice la palabra.",
    duration: "~25 s",
    icon: Layers,
    Component: StroopTestBody,
  },
  {
    id: "memory",
    name: "Memoria de Trabajo",
    description: "Mide tu memoria a corto plazo: memoriza una secuencia de 5 números y reprodúcela.",
    duration: "~20 s",
    icon: Brain,
    Component: MemoryTestBody,
  },
  {
    id: "visual-search",
    name: "Búsqueda Visual",
    description: "Mide tu atención selectiva: encuentra el círculo ligeramente diferente entre 12.",
    duration: "~30 s",
    icon: Eye,
    Component: VisualSearchTestBody,
  },
  {
    id: "math",
    name: "Atención Numérica",
    description: "Mide tu velocidad de cálculo bajo presión: resuelve 5 operaciones mentales rápidas.",
    duration: "~25 s",
    icon: Calculator,
    Component: MathTestBody,
  },
] as const

interface ConcentrationTestProps {
  onScore: (result: MiniTestResult | null) => void
  excludeId?: string | null
}

export function ConcentrationTest({ onScore, excludeId }: ConcentrationTestProps) {
  // Selecciona un test aleatorio en el montaje, evitando repetir el anterior
  const pickRandomTest = (exclude: string | null | undefined) => {
    const pool = exclude
      ? TEST_LIBRARY.filter(t => t.id !== exclude)
      : Array.from(TEST_LIBRARY)
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const [selected, setSelected] = useState(() => pickRandomTest(excludeId))
  const [result, setResult] = useState<MiniTestResult | null>(null)
  const [testKey, setTestKey] = useState(0) // forzar remount del test interno

  const handleComplete = (r: MiniTestResult) => {
    setResult(r)
    onScore(r)
  }

  const retrySame = () => {
    setResult(null)
    onScore(null)
    setTestKey(k => k + 1)
  }

  const tryAnother = () => {
    const next = pickRandomTest(selected.id)
    setSelected(next)
    setResult(null)
    onScore(null)
    setTestKey(k => k + 1)
  }

  const Component = selected.Component
  const Icon = selected.icon

  // ── Estado "done": resultado ─────────────────────────────────────────────
  if (result) {
    const label = scoreLabel(result.score)
    return (
      <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">{result.testName} completado</span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={retrySame}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Repetir
            </button>
            <button
              type="button"
              onClick={tryAnother}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              <Shuffle className="h-3 w-3" /> Otro test
            </button>
          </div>
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="text-3xl font-bold tabular-nums">{result.score}/100</span>
          <span className={cn("text-sm font-medium", label.color)}>{label.text}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Puntaje guardado junto al registro y disponible para el análisis de la IA.
        </p>
      </div>
    )
  }

  // ── Estado "idle" + "running": muestra info + body interno ───────────────
  return (
    <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-primary/10 p-2 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-sm font-semibold">{selected.name}</p>
            <span className="text-xs text-muted-foreground">{selected.duration}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {selected.description}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <Component key={testKey} onComplete={handleComplete} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={tryAnother}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1.5"
        >
          <Shuffle className="h-3 w-3" /> Probar otro test
        </button>
      </div>
    </div>
  )
}
