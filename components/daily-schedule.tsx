"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { TimeBlock, Task } from "@/lib/types"
import { Clock, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface DailyScheduleProps {
  date: Date
  blocks: TimeBlock[]
  tasks: Task[]
  onAddBlock: () => void
  onEditBlock: (block: TimeBlock) => void
  onDeleteBlock: (id: string) => void
  onToggleComplete: (id: string) => void
}

const hours = Array.from({ length: 24 }, (_, i) => i)

export function DailySchedule({
  date,
  blocks,
  tasks,
  onAddBlock,
  onEditBlock,
  onDeleteBlock,
  onToggleComplete,
}: DailyScheduleProps) {
  const dateStr = date.toISOString().split("T")[0]
  const dayBlocks = blocks.filter((b) => b.date === dateStr)

  const getBlocksForHour = (hour: number) => {
    return dayBlocks.filter((block) => {
      const startHour = Number.parseInt(block.startTime.split(":")[0])
      return startHour === hour
    })
  }

  const getTaskTitle = (taskId?: string) => {
    if (!taskId) return null
    const task = tasks.find((t) => t.id === taskId)
    return task?.title
  }

  const typeColors = {
    tarea: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    descanso: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    reunion: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
    otro: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {date.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
            </CardTitle>
            <CardDescription>Horario del día</CardDescription>
          </div>
          <Button onClick={onAddBlock} size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Bloque
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {hours.map((hour) => {
            const hourBlocks = getBlocksForHour(hour)
            const hourStr = hour.toString().padStart(2, "0")

            return (
              <div key={hour} className="flex gap-3 min-h-[60px] border-b border-border/50 last:border-0">
                <div className="w-16 flex-shrink-0 pt-2">
                  <span className="text-sm font-medium text-muted-foreground">{hourStr}:00</span>
                </div>
                <div className="flex-1 py-2 space-y-2">
                  {hourBlocks.length === 0 ? (
                    <div className="h-full flex items-center">
                      <span className="text-xs text-muted-foreground">Sin actividades</span>
                    </div>
                  ) : (
                    hourBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all hover:shadow-md group",
                          typeColors[block.type],
                          block.completed && "opacity-60",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={cn("font-semibold text-sm", block.completed && "line-through")}>
                                {block.title}
                              </h4>
                              {block.completed && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="h-3 w-3" />
                              <span>
                                {block.startTime} - {block.endTime}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {block.type}
                              </Badge>
                            </div>
                            {block.taskId && (
                              <p className="text-xs text-muted-foreground mt-1">Tarea: {getTaskTitle(block.taskId)}</p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onToggleComplete(block.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEditBlock(block)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => onDeleteBlock(block.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
