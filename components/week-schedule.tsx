"use client"

import type { TimeBlock } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CheckCircle2, Trash2, Clock, Plus } from "lucide-react"
import { format, addDays, startOfWeek } from "date-fns"
import { es } from "date-fns/locale"

interface WeekScheduleProps {
  referenceDate: Date
  blocks: TimeBlock[]
  onDayClick: (date: Date) => void
  onToggleComplete: (id: string) => void
  onDeleteBlock: (id: string) => void
  onAddBlock: (date: Date) => void
}

const typeColors: Record<string, string> = {
  tarea: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  descanso: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/25",
  reunion: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/25",
  otro: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/25",
}

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function WeekSchedule({
  referenceDate,
  blocks,
  onDayClick,
  onToggleComplete,
  onDeleteBlock,
  onAddBlock,
}: WeekScheduleProps) {
  const weekStart = startOfWeek(referenceDate, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-7 gap-1 min-w-[560px]">
        {days.map((day, idx) => {
          const dayStr = day.toISOString().split("T")[0]
          const isToday = dayStr === todayStr
          const dayBlocks = blocks
            .filter((b) => b.date === dayStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))

          return (
            <div key={dayStr} className="flex flex-col min-w-0">
              {/* Cabecera del día */}
              <button
                onClick={() => onDayClick(day)}
                className={cn(
                  "w-full text-center px-1 py-2 rounded-t-lg border border-b-0 transition-colors hover:bg-muted/60",
                  isToday
                    ? "border-primary/40 bg-primary/8"
                    : "border-border bg-muted/20"
                )}
              >
                <span className="block text-xs text-muted-foreground font-medium">
                  {dayNames[idx]}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold",
                    isToday && "text-primary"
                  )}
                >
                  {format(day, "d")}
                </span>
              </button>

              {/* Cuerpo del día */}
              <div
                className={cn(
                  "flex-1 rounded-b-lg border p-1 space-y-1 min-h-[140px]",
                  isToday ? "border-primary/40 bg-primary/5" : "border-border"
                )}
              >
                {dayBlocks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[100px] gap-1">
                    <span className="text-xs text-muted-foreground text-center">Sin tareas</span>
                    <button
                      onClick={() => onAddBlock(day)}
                      className="text-muted-foreground/60 hover:text-primary transition-colors"
                      title="Añadir tarea"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    {dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          "p-1.5 rounded border text-xs group",
                          typeColors[block.type] ?? typeColors.otro,
                          block.completed && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-0.5">
                          <span
                            className={cn(
                              "flex-1 font-medium leading-snug break-words",
                              block.completed && "line-through"
                            )}
                          >
                            {block.title}
                          </span>
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => onToggleComplete(block.id)}
                              className="text-green-600 hover:text-green-700"
                              title="Completar"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => onDeleteBlock(block.id)}
                              className="text-destructive hover:text-destructive/80"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{block.startTime}</span>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => onAddBlock(day)}
                      className="w-full text-xs text-muted-foreground/50 hover:text-primary flex items-center justify-center gap-1 py-1 transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
