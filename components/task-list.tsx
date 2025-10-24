"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { Task } from "@/lib/types"
import { CheckCircle2, Circle, Clock, Edit, Trash2, Play, Pause, Lightbulb, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

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

  useEffect(() => {
    if (!isClient || task.status !== 'en-progreso' || !task.startedAt) {
      setElapsed(0)
      return
    }

    // Si la tarea fue reseteada, usar tiempo actual
    const startTime = resetTasks.has(task.id) 
      ? Date.now() 
      : new Date(task.startedAt).getTime()
    
    const baseElapsed = resetTasks.has(task.id) ? 0 : (task.timeElapsed || 0)

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

  if (!isClient) {
    return (
      <div className="flex items-center justify-between gap-2 text-sm font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-md">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 animate-pulse" />
          <span>00:00:00</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onResetTimer(task.id)}
          className="h-6 px-2 text-xs"
        >
          Reset
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm font-mono bg-blue-500/10 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-md">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 animate-pulse" />
        <span>{formatTime(elapsed)}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onResetTimer(task.id)}
        className="h-6 px-2 text-xs"
      >
        Reset
      </Button>
    </div>
  )
}

function TaskAdvice({ task }: { task: Task }) {
  const [advice, setAdvice] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [showAdvice, setShowAdvice] = useState(false)

  const getAdvice = async () => {
    if (advice) {
      setShowAdvice(!showAdvice)
      return
    }

    setLoading(true)
    try {
      const response = await fetch("/api/gemini/advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        {loading ? "Generando consejo..." : advice ? (showAdvice ? "Ocultar consejo" : "Ver consejo") : "Obtener consejo de IA"}
      </Button>
      {showAdvice && advice && (
        <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md text-sm">
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
      console.log("Timer reseteado para tarea:", taskId)
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
