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

// Clampea un string numérico al rango [min, max]; usa fallback si no es un número válido
function clampInt(val: string, min: number, max: number, fallback: number): string {
  const n = parseInt(val, 10)
  if (isNaN(n)) return String(fallback)
  return String(Math.max(min, Math.min(max, n)))
}

const MAX_TITLE = 100
const MAX_DESCRIPTION = 500
const MAX_TAGS_TEXT = 150
const MAX_SUBTASKS = 15
const MAX_SUBTASK_TITLE = 100
const MAX_DURATION_MIN = 480  // 8 horas

export function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const today = new Date().toISOString().split("T")[0]

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

  const [recurrence, setRecurrence] = useState<Task["recurrence"]>(task?.recurrence || "none")
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(
    task?.recurrence !== undefined && task.recurrence !== 'none'
  )
  const [recurrenceDays, setRecurrenceDays] = useState(task?.recurrenceDays?.toString() || "2")
  const [recurrenceEnd, setRecurrenceEnd] = useState(task?.recurrenceEnd || "")
  const [isFixedTime, setIsFixedTime] = useState(task?.isFixedTime || false)
  const [subtasks, setSubtasks] = useState<SubTask[]>(task?.subtasks || [])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("")

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
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      const selected = new Date(val + 'T00:00:00')
      if (selected < todayDate) {
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
        if (data.estimatedMinutes) setEstimatedMinutes(String(Math.min(data.estimatedMinutes, MAX_DURATION_MIN)))
        if (data.priority) setPriority(data.priority as Task["priority"])
        if (data.category) setCategory(data.category as Task["category"])
        if (data.status) setStatus(data.status as Task["status"])
        if (data.tags && Array.isArray(data.tags) && data.tags.length > 0) {
          setTags(data.tags.slice(0, 5).join(', '))
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
          const generated: SubTask[] = data.subtasks
            .slice(0, MAX_SUBTASKS - subtasks.length)
            .map((s: any, i: number) => ({
              id: `ai-${Date.now()}-${i}`,
              title: String(s.title).slice(0, MAX_SUBTASK_TITLE),
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
    const trimmed = newSubtaskTitle.trim().slice(0, MAX_SUBTASK_TITLE)
    if (!trimmed || subtasks.length >= MAX_SUBTASKS) return
    setSubtasks(prev => [
      ...prev,
      { id: `manual-${Date.now()}`, title: trimmed, completed: false },
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

    const parsedTags = tags
      ? tags.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5)
      : undefined

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      priority,
      status,
      estimatedMinutes: estimatedMinutes ? Number.parseInt(estimatedMinutes) : undefined,
      dueDate: dueDate || undefined,
      hour: hour ? Number.parseInt(hour) : 9,
      tags: parsedTags,
      recurrence: recurrenceEnabled ? recurrence : 'none',
      recurrenceDays: recurrence === 'custom' ? Number.parseInt(recurrenceDays) || 2 : undefined,
      recurrenceEnd: recurrenceEnabled && recurrenceEnd ? recurrenceEnd : undefined,
      isFixedTime,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    })
  }

  const tagsCount = tags ? tags.split(",").map(t => t.trim()).filter(Boolean).length : 0

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

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
              placeholder="Nombre de la tarea"
              required
              maxLength={MAX_TITLE}
            />
            {title.length > 80 && (
              <p className="text-xs text-muted-foreground text-right">{title.length}/{MAX_TITLE}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                disabled={!title.trim() || aiLoading}
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
                disabled={!title.trim() || decomposeLoading}
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

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              placeholder="Detalles adicionales..."
              rows={3}
              maxLength={MAX_DESCRIPTION}
            />
            {description.length > 400 && (
              <p className="text-xs text-muted-foreground text-right">{description.length}/{MAX_DESCRIPTION}</p>
            )}
          </div>

          {/* Categoría + Prioridad */}
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

          {/* Estado + Duración */}
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
              <Label htmlFor="estimatedMinutes">Duración (min, máx. 8 h)</Label>
              <Input
                id="estimatedMinutes"
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                onBlur={(e) => {
                  if (e.target.value) setEstimatedMinutes(clampInt(e.target.value, 1, MAX_DURATION_MIN, 60))
                }}
                placeholder="60"
                min="1"
                max={MAX_DURATION_MIN}
                step="1"
              />
            </div>
          </div>

          {/* Fecha límite + Hora */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha límite</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                min={today}
                className={cn(dueDateError && "border-destructive")}
              />
              {dueDateError && (
                <p className="text-xs text-destructive">{dueDateError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="hour">Hora de inicio (0–23)</Label>
              <Input
                id="hour"
                type="number"
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                onBlur={(e) => setHour(clampInt(e.target.value, 0, 23, 9))}
                placeholder="9"
                min="0"
                max="23"
                step="1"
              />
            </div>
          </div>

          {/* Etiquetas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tags">Etiquetas (separadas por comas, máx. 5)</Label>
              {tagsCount > 0 && (
                <span className={cn("text-xs", tagsCount > 5 ? "text-destructive" : "text-muted-foreground")}>
                  {tagsCount}/5
                </span>
              )}
            </div>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value.slice(0, MAX_TAGS_TEXT))}
              placeholder="urgente, importante, cliente"
              maxLength={MAX_TAGS_TEXT}
              className={cn(tagsCount > 5 && "border-destructive")}
            />
            {tagsCount > 5 && (
              <p className="text-xs text-destructive">Solo se guardarán las primeras 5 etiquetas</p>
            )}
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
                    <Label htmlFor="recurrenceDays">Cada cuántos días (1–365)</Label>
                    <Input
                      id="recurrenceDays"
                      type="number"
                      value={recurrenceDays}
                      onChange={(e) => setRecurrenceDays(e.target.value)}
                      onBlur={(e) => setRecurrenceDays(clampInt(e.target.value, 1, 365, 2))}
                      placeholder="2"
                      min="1"
                      max="365"
                      step="1"
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
                    min={dueDate || today}
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
              <Label>Subtareas ({subtasks.length}/{MAX_SUBTASKS})</Label>
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

          {/* Añadir subtarea */}
          {subtasks.length < MAX_SUBTASKS ? (
            <div className="flex gap-2">
              <Input
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value.slice(0, MAX_SUBTASK_TITLE))}
                placeholder="Añadir subtarea..."
                className="text-sm"
                maxLength={MAX_SUBTASK_TITLE}
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
          ) : (
            <p className="text-xs text-muted-foreground">Máximo {MAX_SUBTASKS} subtareas alcanzado</p>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={!!dueDateError || !title.trim()}>
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
