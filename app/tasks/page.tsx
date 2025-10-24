"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { TaskForm } from "@/components/task-form"
import { TaskList } from "@/components/task-list"
import type { Task } from "@/lib/types"
import { Plus } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | undefined>()
  const [loading, setLoading] = useState(true)

  const loadTasks = async () => {
    try {
      const response = await fetch("/api/tasks")
      if (!response.ok) return
      const data = await response.json()
      
      // Convertir tareas de BD al formato de Task
      const convertedTasks: Task[] = (data.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        description: t.description || undefined,
        category: (t.category || "personal") as Task["category"],
        priority: (t.priority || "media") as Task["priority"],
        status: (t.status || (t.completed ? "completada" : "pendiente")) as Task["status"],
        estimatedMinutes: t.duration || undefined,
        hour: t.hour,
        dueDate: t.due_date || t.date || undefined,
        tags: t.tags ? t.tags.split(',').filter(Boolean) : undefined,
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
        startedAt: t.started_at,
        timeElapsed: t.time_elapsed || 0,
        completedAt: t.completed_at,
      }))
      
      setTasks(convertedTasks)
    } catch (error) {
      console.error("Error cargando tareas:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTasks()
  }, [])

  const handleSubmit = async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (editingTask) {
        // Actualizar
        const response = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingTask.id,
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            priority: taskData.priority,
            status: taskData.status,
            duration: taskData.estimatedMinutes,
            hour: taskData.hour,
            date: taskData.dueDate,
            due_date: taskData.dueDate,
            tags: taskData.tags,
          }),
        })
        
        if (!response.ok) {
          throw new Error("Error al actualizar tarea")
        }
      } else {
        // Crear
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: taskData.title,
            description: taskData.description,
            category: taskData.category || 'personal',
            priority: taskData.priority || 'media',
            status: taskData.status || 'pendiente',
            duration: taskData.estimatedMinutes || 60,
            hour: taskData.hour || 9,
            date: taskData.dueDate || new Date().toISOString().split('T')[0],
            due_date: taskData.dueDate,
            tags: taskData.tags,
          }),
        })
        
        if (!response.ok) {
          console.error("Error response:", await response.text())
          throw new Error("Error al crear tarea")
        }
        
        console.log("✅ Tarea creada exitosamente")
      }
      
      await loadTasks()
      setShowForm(false)
      setEditingTask(undefined)
    } catch (error) {
      console.error("Error guardando tarea:", error)
      alert("Error al guardar la tarea. Por favor intenta de nuevo.")
    }
  }

  const handleEdit = (task: Task) => {
    setEditingTask(task)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta tarea?")) return
    
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" })
      await loadTasks()
    } catch (error) {
      console.error("Error eliminando tarea:", error)
    }
  }

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    try {
      const updateData: any = { 
        id, 
        status,
        completed: status === "completada" ? 1 : 0,
      }
      
      // Si cambia a en-progreso, registrar started_at
      if (status === 'en-progreso') {
        updateData.started_at = new Date().toISOString()
        updateData.time_elapsed = 0
      }
      
      // Si se completa, registrar completed_at
      if (status === 'completada') {
        updateData.completed_at = new Date().toISOString()
      }
      
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })
      await loadTasks()
    } catch (error) {
      console.error("Error actualizando estado:", error)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingTask(undefined)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pt-20 pb-20 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Mis Tareas</h1>
              <p className="text-sm md:text-base text-muted-foreground">Gestiona todas tus actividades</p>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Nueva Tarea
              </Button>
            )}
          </div>

          {showForm ? (
            <TaskForm task={editingTask} onSubmit={handleSubmit} onCancel={handleCancel} />
          ) : (
            <TaskList tasks={tasks} onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatusChange} />
          )}
        </div>
      </div>
    </AppLayout>
  )
}
