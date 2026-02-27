"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Task } from "@/lib/types"
import { CheckCircle2, Circle, Clock, Edit, Trash2, Play, Pause, Lightbulb, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"

interface TaskListProps {
  tasks: Task[]
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onStatusChange: (id: string, status: Task["status"]) => void
}

const priorityColors = {
  baja: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  media: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  alta: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgente: "bg-red-500/10 text-red-700 dark:text-red-400",
}

const categoryColors = {
  trabajo: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  personal: "bg-green-500/10 text-green-700 dark:text-green-400",
  estudio: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  salud: "bg-pink-500/10 text-pink-700 dark:text-pink-400",
  otro: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
}

function TaskTimer({ task, onResetTimer, resetTasks }: { task: Task, onResetTimer: (taskId: string) => void, resetTasks: Set<string> }) {
  const [elapsed, setElapsed] = useState(0)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // Limpiar localStorage cuando la tarea sale de en-progreso
  useEffect(() => {
    if (task.status !== 'en-progreso') {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`tw_timer_${task.id}`)
      }
    }
  }, [task.status, task.id])

  useEffect(() => {
    if (!isClient || task.status !== 'en-progreso') {
      setElapsed(0)
      return
    }

    let startTime: number
    let baseElapsed: number

    if (resetTasks.has(task.id)) {
      // Timer reseteado: empezar desde cero y persistir
      startTime = Date.now()
      baseElapsed = 0
      localStorage.setItem(`tw_timer_${task.id}`, JSON.stringify({ startTime, baseElapsed }))
    } else {
      // Intentar leer desde localStorage
      const stored = localStorage.getItem(`tw_timer_${task.id}`)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          startTime = parsed.startTime
          baseElapsed = parsed.baseElapsed ?? 0
        } catch {
          startTime = task.startedAt ? new Date(task.startedAt).getTime() : Date.now()
          baseElapsed = task.timeElapsed || 0
          localStorage.setItem(`tw_timer_${task.id}`, JSON.stringify({ startTime, baseElapsed }))
        }
      } else if (task.startedAt) {
        // Sin localStorage: usar startedAt de la tarea y persistir
        startTime = new Date(task.startedAt).getTime()
        baseElapsed = task.timeElapsed || 0
        localStorage.setItem(`tw_timer_${task.id}`, JSON.stringify({ startTime, baseElapsed }))
      } else {
        startTime = Date.now()
        baseElapsed = 0
        localStorage.setItem(`tw_timer_${task.id}`, JSON.stringify({ startTime, baseElapsed }))
      }
    }

    const updateTimer = () => {
      const now = Date.now()
      const diff = Math.max(0, Math.floor((now - startTime) / 1000) + baseElapsed)
      setElapsed(diff)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [isClient, task.status, task.startedAt, task.timeElapsed, task.id, resetTasks])

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  if (task.status !== 'en-progreso') return null

  const estimatedSeconds = (task.estimatedMinutes || 60) * 60
  const progress = Math.min((elapsed / estimatedSeconds) * 100, 100)
  const isOverTime = elapsed > estimatedSeconds

  const ringColor = isOverTime
    ? "text-red-700 dark:text-red-400 bg-red-500/10"
    : progress >= 75
    ? "text-amber-700 dark:text-amber-400 bg-amber-500/10"
    : "text-blue-700 dark:text-blue-400 bg-blue-500/10"

  const barColor = isOverTime ? "bg-red-500" : progress >= 75 ? "bg-amber-500" : "bg-blue-500"

  if (!isClient) {
    return (
      <div className="space-y-1.5">
        <div className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm", "text-blue-700 dark:text-blue-400 bg-blue-500/10")}>
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="h-4 w-4 animate-pulse shrink-0" />
            <span className="font-mono font-medium tabular-nums">00:00:00</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs opacity-60 font-mono tabular-nums">/ {formatTime(estimatedSeconds)}</span>
            <Button variant="ghost" size="sm" onClick={() => onResetTimer(task.id)} className="h-6 px-2 text-xs">
              Reset
            </Button>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mx-1">
          <div className="h-full rounded-full bg-blue-500 transition-all duration-1000" style={{ width: '0%' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className={cn("flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm", ringColor)}>
        <div className="flex items-center gap-2 min-w-0">
          <Clock className="h-4 w-4 animate-pulse shrink-0" />
          <span className="font-mono font-medium tabular-nums">{formatTime(elapsed)}</span>
          {isOverTime && (
            <span className="text-xs opacity-80 hidden sm:inline">• Tiempo excedido</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs opacity-60 font-mono tabular-nums">/ {formatTime(estimatedSeconds)}</span>
          <Button variant="ghost" size="sm" onClick={() => onResetTimer(task.id)} className="h-6 px-2 text-xs">
            Reset
          </Button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-secondary overflow-hidden mx-1">
        <div
          className={cn("h-full rounded-full transition-all duration-1000", barColor)}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function TaskAdvice({ task }: { task: Task }) {
  const [advice, setAdvice] = useState<string>("")
  const [source, setSource] = useState<AiSource>("gemini")
  const [loading, setLoading] = useState(false)
  const [showAdvice, setShowAdvice] = useState(false)

  const getAdvice = async () => {
    if (advice) {
      setShowAdvice(!showAdvice)
      return
    }

    setLoading(true)
    try {
      // Extraer ID numérico (quitar prefijo "db-" si existe)
      const numericId = task.id.replace(/^db-/, "")
      const response = await fetch("/api/gemini/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: numericId,
          title: task.title,
          description: task.description,
          category: task.category,
          priority: task.priority,
          duration: task.estimatedMinutes,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setAdvice(data.advice)
        setSource(data.source ?? "gemini")
        setShowAdvice(true)
      }
    } catch (error) {
      console.error("Error obteniendo consejo:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-3">
      <Button
        variant="ghost"
        size="sm"
        onClick={getAdvice}
        disabled={loading}
        className="gap-2 text-xs"
      >
        <Lightbulb className="h-3 w-3" />
        {loading ? "Generando consejo..." : advice ? (showAdvice ? "Ocultar consejo" : "Ver consejo") : "Consejo de IA"}
      </Button>
      {showAdvice && advice && (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md text-sm space-y-2">
          <AiSourceBadge source={source} />
          <p className="text-yellow-800 dark:text-yellow-200">{advice}</p>
        </div>
      )}
    </div>
  )
}

export function TaskList({ tasks, onEdit, onDelete, onStatusChange }: TaskListProps) {
  const [filter, setFilter] = useState<"todas" | "pendiente" | "en-progreso" | "completada">("todas")
  const [resetTasks, setResetTasks] = useState<Set<string>>(new Set())

  const handleResetTimer = async (taskId: string) => {
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: taskId,
          started_at: new Date().toISOString(),
          time_elapsed: 0,
        }),
      })
      // Marcar tarea como reseteada para actualizar el timer localmente
      setResetTasks(prev => new Set([...prev, taskId]))
      if (process.env.NODE_ENV !== "production") {
        console.log("Timer reseteado para tarea:", taskId)
      }
    } catch (error) {
      console.error("Error reseteando timer:", error)
    }
  }

  const filteredTasks = tasks.filter((task) => {
    if (filter === "todas") return true
    return task.status === filter
  })

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Primero por estado (pendientes primero)
    const statusOrder = { pendiente: 0, "en-progreso": 1, completada: 2, cancelada: 3 }
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status]
    }
    // Luego por prioridad
    const priorityOrder = { urgente: 0, alta: 1, media: 2, baja: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === "todas" ? "default" : "outline"} size="sm" onClick={() => setFilter("todas")}>
          Todas ({tasks.length})
        </Button>
        <Button
          variant={filter === "pendiente" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pendiente")}
        >
          Pendientes ({tasks.filter((t) => t.status === "pendiente").length})
        </Button>
        <Button
          variant={filter === "en-progreso" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("en-progreso")}
        >
          En Progreso ({tasks.filter((t) => t.status === "en-progreso").length})
        </Button>
        <Button
          variant={filter === "completada" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("completada")}
        >
          Completadas ({tasks.filter((t) => t.status === "completada").length})
        </Button>
      </div>

      <div className="space-y-3">
        {sortedTasks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No hay tareas {filter !== "todas" && `en estado "${filter}"`}
            </CardContent>
          </Card>
        ) : (
          sortedTasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                "transition-all hover:shadow-md",
                task.status === "completada" && "opacity-60",
                task.status === "en-progreso" && "border-blue-500/50"
              )}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 mt-1"
                      onClick={() => onStatusChange(task.id, task.status === "completada" ? "pendiente" : "completada")}
                    >
                      {task.status === "completada" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </Button>
                    <div className="flex-1">
                      <CardTitle
                        className={cn("text-lg", task.status === "completada" && "line-through text-muted-foreground")}
                      >
                        {task.title}
                      </CardTitle>
                      {task.description && <CardDescription className="mt-1">{task.description}</CardDescription>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {task.status === "pendiente" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStatusChange(task.id, "en-progreso")}
                        title="Iniciar tarea"
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    {task.status === "en-progreso" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onStatusChange(task.id, "pendiente")}
                        title="Pausar tarea"
                      >
                        <Pause className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => onEdit(task)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(task.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
                  <Badge className={categoryColors[task.category]}>{task.category}</Badge>
                  {task.estimatedMinutes && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" />
                      {task.estimatedMinutes}min
                    </Badge>
                  )}
                  {task.tags?.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                {task.status === 'en-progreso' && <TaskTimer task={task} onResetTimer={handleResetTimer} resetTasks={resetTasks} />}

                {task.dueDate && (
                  <p className="text-sm text-muted-foreground">
                    Vence: {new Date(task.dueDate).toLocaleDateString("es-ES")}
                  </p>
                )}

                {task.status !== "completada" && <TaskAdvice task={task} />}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
