"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Task } from "@/lib/types"
import { CheckCircle2, Circle, ArrowRight } from "lucide-react"
import Link from "next/link"

interface RecentTasksProps {
  tasks: Task[]
  onStatusChange: (id: string, status: Task["status"]) => void
}

const priorityColors = {
  baja: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  media: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  alta: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  urgente: "bg-red-500/10 text-red-700 dark:text-red-400",
}

export function RecentTasks({ tasks, onStatusChange }: RecentTasksProps) {
  const pendingTasks = tasks
    .filter((t) => t.status === "pendiente" || t.status === "en-progreso")
    .sort((a, b) => {
      const priorityOrder = { urgente: 0, alta: 1, media: 2, baja: 3 }
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tareas Pendientes</CardTitle>
          <CardDescription>Tus próximas actividades prioritarias</CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tasks" className="gap-1">
            Ver todas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {pendingTasks.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay tareas pendientes</p>
        ) : (
          <div className="space-y-3">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 mt-0.5"
                  onClick={() => onStatusChange(task.id, task.status === "completada" ? "pendiente" : "completada")}
                >
                  {task.status === "completada" ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{task.title}</h4>
                  <div className="flex gap-2 mt-1">
                    <Badge className={priorityColors[task.priority]} variant="secondary">
                      {task.priority}
                    </Badge>
                    {task.dueDate && (
                      <span className="text-xs text-muted-foreground">
                        Vence: {new Date(task.dueDate).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
