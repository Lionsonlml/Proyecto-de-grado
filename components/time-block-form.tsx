"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TimeBlock, Task } from "@/lib/types"
import { X } from "lucide-react"

interface TimeBlockFormProps {
  block?: TimeBlock
  tasks: Task[]
  defaultDate?: string
  onSubmit: (block: Omit<TimeBlock, "id">) => void
  onCancel: () => void
}

export function TimeBlockForm({ block, tasks, defaultDate, onSubmit, onCancel }: TimeBlockFormProps) {
  const [title, setTitle] = useState(block?.title || "")
  const [date, setDate] = useState(block?.date || defaultDate || new Date().toISOString().split("T")[0])
  const [startTime, setStartTime] = useState(block?.startTime || "09:00")
  const [endTime, setEndTime] = useState(block?.endTime || "10:00")
  const [type, setType] = useState<TimeBlock["type"]>(block?.type || "tarea")
  const [taskId, setTaskId] = useState(block?.taskId || "none")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      title,
      date,
      startTime,
      endTime,
      type,
      taskId: taskId === "none" ? undefined : taskId,
      completed: block?.completed || false,
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{block ? "Editar Bloque" : "Nuevo Bloque de Tiempo"}</CardTitle>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nombre de la actividad"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Hora de inicio</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Hora de fin</Label>
              <Input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TimeBlock["type"])}>
              <SelectTrigger id="type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tarea">Tarea</SelectItem>
                <SelectItem value="descanso">Descanso</SelectItem>
                <SelectItem value="reunion">Reunión</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === "tarea" && (
            <div className="space-y-2">
              <Label htmlFor="taskId">Vincular con tarea (opcional)</Label>
              <Select value={taskId} onValueChange={setTaskId}>
                <SelectTrigger id="taskId">
                  <SelectValue placeholder="Seleccionar tarea..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ninguna</SelectItem>
                  {tasks
                    .filter((t) => t.status !== "completada")
                    .map((task) => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              {block ? "Actualizar" : "Crear"} Bloque
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
