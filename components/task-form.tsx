"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { Task, SubTask } from "@/lib/types"
import { X, Loader2, Sparkles, Repeat, Lock, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface TaskFormProps {
  task?: Task
  onSubmit: (task: Omit<Task, "id" | "createdAt" | "updatedAt">) => void
  onCancel: () => void
}

export function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "")
  const [description, setDescription] = useState(task?.description || "")
  const [category, setCategory] = useState<Task["category"]>(task?.category || "personal")
  const [priority, setPriority] = useState<Task["priority"]>(task?.priority || "media")
  const [status, setStatus] = useState<Task["status"]>(task?.status || "pendiente")
  const [estimatedMinutes, setEstimatedMinutes] = useState(task?.estimatedMinutes?.toString() || "")
  const [dueDate, setDueDate] = useState(task?.dueDate || "")
  const [hour, setHour] = useState(task?.hour?.toString() || "9")
  const [tags, setTags] = useState(task?.tags?.join(", ") || "")
  const [dueDateError, setDueDateError] = useState("")

  // Campos nuevos
  const [recurrence, setRecurrence] = useState<Task["recurrence"]>(task?.recurrence || "none")
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(
    task?.recurrence !== undefined && task.recurrence !== 'none'
  )
  const [recurrenceDays, setRecurrenceDays] = useState(task?.recurrenceDays?.toString() || "2")
  const [recurrenceEnd, setRecurrenceEnd] = useState(task?.recurrenceEnd || "")
  const [isFixedTime, setIsFixedTime] = useState(task?.isFixedTime || false)
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || [])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")

  // Estados de IA
  const [aiLoading, setAiLoading] = useState(false)
  const [decomposeLoading, setDecomposeLoading] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState<{
    estimatedMinutes?: number
    priority?: string
    tags?: string[]
    reasoning?: string
    source?: string
  } | null>(null)

  const handleDueDateChange = (val: string) => {
    setDueDate(val)
    if (val) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const selected = new Date(val + 'T00:00:00')
      if (selected < today) {
        setDueDateError("La fecha límite no puede ser en el pasado")
      } else {
        setDueDateError("")
      }
    } else {
      setDueDateError("")
    }
  }

  const handleAiSuggest = async () => {
    if (!title) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/tasks/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, mode: 'suggest' }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiSuggestion(data)
        if (data.estimatedMinutes) setEstimatedMinutes(String(data.estimatedMinutes))
        if (data.priority) setPriority(data.priority as Task["priority"])
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          setTags(data.tags.join(', '))
        }
      }
    } catch {
      // ignorar
    } finally {
      setAiLoading(false)
    }
  }

  const handleDecompose = async () => {
    if (!title) return
    setDecomposeLoading(true)
    try {
      const res = await fetch('/api/tasks/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, mode: 'decompose' }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.subtasks && Array.isArray(data.subtasks)) {
          const generated: SubTask[] = data.subtasks.map((s: any, i: number) => ({
            id: `ai-${Date.now()}-${i}`,
            title: s.title,
            completed: false,
          }))
          setSubtasks(prev => [...prev, ...generated])
        }
      }
    } catch {
      // ignorar
    } finally {
      setDecomposeLoading(false)
    }
  }

  const addSubtask = () => {
    if (!newSubtaskTitle.trim()) return
    setSubtasks(prev => [
      ...prev,
      { id: `manual-${Date.now()}`, title: newSubtaskTitle.trim(), completed: false },
    ])
    setNewSubtaskTitle("")
  }

  const toggleSubtask = (id: string) => {
    setSubtasks(prev => prev.map(s => s.id === id ? { ...s, completed: !s.completed } : s))
  }

  const removeSubtask = (id: string) => {
    setSubtasks(prev => prev.filter(s => s.id !== id))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (dueDateError) return

    onSubmit({
      title,
      description: description || undefined,
      category,
      priority,
      status,
      estimatedMinutes: estimatedMinutes ? Number.parseInt(estimatedMinutes) : undefined,
      dueDate: dueDate || undefined,
      hour: hour ? Number.parseInt(hour) : 9,
      tags: tags
        ? tags.split(",").map((t) => t.trim()).filter(Boolean)
        : undefined,
      recurrence: recurrenceEnabled ? recurrence : 'none',
      recurrenceDays: recurrence === 'custom' ? Number.parseInt(recurrenceDays) || 2 : undefined,
      recurrenceEnd: recurrenceEnabled && recurrenceEnd ? recurrenceEnd : undefined,
      isFixedTime,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{task ? "Editar Tarea" : "Nueva Tarea"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título + botón IA */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la tarea"
              required
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={!title || aiLoading}
                onClick={handleAiSuggest}
              >
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                Optimizar con IA
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={!title || decomposeLoading}
                onClick={handleDecompose}
              >
                {decomposeLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                Desglosar tarea
              </Button>
            </div>
            {aiSuggestion && (
              <div className="p-2 rounded-md border bg-muted/50 text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Sugerido por IA {aiSuggestion.source === 'fallback' ? '(modo demo)' : ''}</span>
                </div>
                {aiSuggestion.reasoning && (
                  <p className="text-muted-foreground">{aiSuggestion.reasoning}</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalles adicionales..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as Task["category"])}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trabajo">Trabajo</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="estudio">Estudio</SelectItem>
                  <SelectItem value="salud">Salud</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as Task["priority"])}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as Task["status"])}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en-progreso">En Progreso</SelectItem>
                  <SelectItem value="completada">Completada</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedMinutes">Tiempo estimado (min)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="60"
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha límite</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className={cn(dueDateError && "border-destructive")}
              />
              {dueDateError && (
                <p className="text-xs text-destructive">{dueDateError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hour">Hora (0-23)</Label>
              <Input
                id="hour"
                type="number"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                placeholder="9"
                min="0"
                max="23"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Etiquetas (separadas por comas)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="urgente, importante, cliente"
            />
          </div>

          {/* Sección Repetir */}
          <div className="space-y-3 pt-1 border-t">
            <div className="flex items-center gap-2 pt-2">
              <Checkbox
                id="recurrenceEnabled"
                checked={recurrenceEnabled}
                onCheckedChange={(v) => setRecurrenceEnabled(Boolean(v))}
              />
              <Label htmlFor="recurrenceEnabled" className="flex items-center gap-1.5 cursor-pointer">
                <Repeat className="h-3.5 w-3.5" />
                Repetir tarea
              </Label>
            </div>

            {recurrenceEnabled && (
              <div className="space-y-3 pl-6">
                <div className="space-y-2">
                  <Label>Frecuencia</Label>
                  <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Task["recurrence"])}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diaria</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensual</SelectItem>
                      <SelectItem value="weekdays">Lunes a Viernes</SelectItem>
                      <SelectItem value="custom">Cada X días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurrence === 'custom' && (
                  <div className="space-y-2">
                    <Label htmlFor="recurrenceDays">Cada cuántos días</Label>
                    <Input
                      id="recurrenceDays"
                      type="number"
                      value={recurrenceDays}
                      onChange={(e) => setRecurrenceDays(e.target.value)}
                      placeholder="2"
                      min="1"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="recurrenceEnd">Hasta (fecha fin, opcional)</Label>
                  <Input
                    id="recurrenceEnd"
                    type="date"
                    value={recurrenceEnd}
                    onChange={(e) => setRecurrenceEnd(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Fecha/hora fija */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="isFixedTime"
              checked={isFixedTime}
              onCheckedChange={(v) => setIsFixedTime(Boolean(v))}
            />
            <Label htmlFor="isFixedTime" className="flex items-center gap-1.5 cursor-pointer">
              <Lock className="h-3.5 w-3.5" />
              Fecha/hora fija
              <span className="text-xs text-muted-foreground">(no se moverá al optimizar el horario)</span>
            </Label>
          </div>

          {/* Subtareas */}
          {subtasks.length > 0 && (
            <div className="space-y-2">
              <Label>Subtareas</Label>
              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={sub.completed}
                      onCheckedChange={() => toggleSubtask(sub.id)}
                    />
                    <span className={cn("flex-1 text-sm", sub.completed && "line-through text-muted-foreground")}>
                      {sub.title}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeSubtask(sub.id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Añadir subtarea manualmente */}
          <div className="flex gap-2">
            <Input
              value={newSubtaskTitle}
              onChange={(e) => setNewSubtaskTitle(e.target.value)}
              placeholder="Añadir subtarea..."
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addSubtask()
                }
              }}
            />
            <Button type="button" variant="outline" size="sm" onClick={addSubtask} disabled={!newSubtaskTitle.trim()}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={!!dueDateError}>
              {task ? "Actualizar" : "Crear"} Tarea
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
