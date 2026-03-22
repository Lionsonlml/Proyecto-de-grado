"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Timer, Play, Pause, RotateCcw, Coffee } from "lucide-react"
import { cn } from "@/lib/utils"

interface PomodoroTimerProps {
  taskId: string
  taskTitle: string
  onSessionComplete: (sessions: number) => void
  onClose: () => void
}

const WORK_SECONDS = 25 * 60
const BREAK_SECONDS = 5 * 60

export function PomodoroTimer({ taskId, taskTitle, onSessionComplete, onClose }: PomodoroTimerProps) {
  const [phase, setPhase] = useState<'work' | 'break' | 'idle'>('idle')
  const [timeLeft, setTimeLeft] = useState(WORK_SECONDS)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(() => {
    if (typeof window === 'undefined') return 0
    return parseInt(localStorage.getItem(`tw_pomodoro_${taskId}`) || '0')
  })
  const [askContinue, setAskContinue] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start()
      osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [])

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          setRunning(false)
          playBeep()
          if (phase === 'work') {
            const newSessions = sessions + 1
            setSessions(newSessions)
            localStorage.setItem(`tw_pomodoro_${taskId}`, String(newSessions))
            onSessionComplete(newSessions)
            setAskContinue(true)
          } else {
            // Break terminado → volver a work
            setPhase('work')
            return WORK_SECONDS
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, phase, sessions, taskId, playBeep, onSessionComplete])

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const totalSeconds = phase === 'break' ? BREAK_SECONDS : WORK_SECONDS
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100

  const handleStart = () => {
    if (phase === 'idle') setPhase('work')
    setRunning(true)
    setAskContinue(false)
  }
  const handleReset = () => {
    setRunning(false)
    setPhase('idle')
    setTimeLeft(WORK_SECONDS)
    setAskContinue(false)
  }

  return (
    <div className="p-4 rounded-lg border bg-card space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Timer className="h-4 w-4 text-primary" />
          <span>Pomodoro</span>
          {sessions > 0 && <span className="text-xs text-muted-foreground">({sessions} sesiones)</span>}
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={onClose}>✕</Button>
      </div>

      <div className={cn(
        "text-center py-3 rounded-md",
        phase === 'break' ? "bg-green-500/10" : phase === 'work' ? "bg-primary/10" : "bg-muted/50"
      )}>
        <p className="text-xs text-muted-foreground mb-1">
          {phase === 'break' ? '☕ Descanso' : phase === 'work' ? '🎯 Trabajo' : '⏸ Listo'}
        </p>
        <p className="text-3xl font-mono font-bold tabular-nums">{formatTime(timeLeft)}</p>
      </div>

      <Progress value={progress} className="h-2" />

      {askContinue ? (
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium">¡Pomodoro completado! ¿Qué deseas hacer?</p>
          <div className="flex gap-2 justify-center">
            <Button size="sm" variant="outline" className="gap-1" onClick={() => {
              setPhase('break')
              setTimeLeft(BREAK_SECONDS)
              setAskContinue(false)
              setRunning(true)
            }}>
              <Coffee className="h-3 w-3" />Descanso 5min
            </Button>
            <Button size="sm" onClick={() => {
              setPhase('work')
              setTimeLeft(WORK_SECONDS)
              setAskContinue(false)
              setRunning(true)
            }}>
              Otro pomodoro
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2 justify-center">
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          <Button size="sm" onClick={running ? () => setRunning(false) : handleStart} className="gap-1">
            {running ? <><Pause className="h-3 w-3" />Pausar</> : <><Play className="h-3 w-3" />Iniciar</>}
          </Button>
        </div>
      )}
    </div>
  )
}
