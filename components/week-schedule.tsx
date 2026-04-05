"use client"

import { useState } from "react"
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

const dotColors: Record<string, string> = {
  tarea: "bg-blue-500",
  descanso: "bg-green-500",
  reunion: "bg-purple-500",
  otro: "bg-gray-500",
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

  // En móvil: día seleccionado en el panel inferior
  const defaultIdx = days.findIndex((d) => d.toISOString().split("T")[0] === todayStr)
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx >= 0 ? defaultIdx : 0)
  const selectedDay = days[selectedIdx]
  const selectedDayStr = selectedDay.toISOString().split("T")[0]
  const selectedBlocks = blocks
    .filter((b) => b.date === selectedDayStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  return (
    <>
      {/* ── MÓVIL: tab strip + panel del día seleccionado ───────────────────── */}
      <div className="md:hidden">
        {/* Tab strip horizontal */}
        <div className="flex overflow-x-auto gap-1 pb-2 scrollbar-none">
          {days.map((day, idx) => {
            const dayStr = day.toISOString().split("T")[0]
            const isToday = dayStr === todayStr
            const isSelected = idx === selectedIdx
            const dayBlocks = blocks.filter((b) => b.date === dayStr)

            return (
              <button
                key={dayStr}
                onClick={() => setSelectedIdx(idx)}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-all min-w-[52px]",
                  isSelected
                    ? "border-primary bg-primary/10 text-primary"
                    : isToday
                    ? "border-primary/40 bg-primary/5 text-foreground"
                    : "border-border bg-muted/20 text-muted-foreground"
                )}
              >
                <span className="text-[10px] font-medium uppercase">{dayNames[idx]}</span>
                <span className={cn("text-lg font-bold leading-tight", isToday && !isSelected && "text-primary")}>
                  {format(day, "d")}
                </span>
                {/* Dots de tareas */}
                <div className="flex gap-0.5 mt-0.5 min-h-[8px]">
                  {dayBlocks.slice(0, 4).map((b) => (
                    <span
                      key={b.id}
                      className={cn("w-1.5 h-1.5 rounded-full", dotColors[b.type] ?? "bg-gray-400")}
                    />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Panel del día seleccionado */}
        <div
          className={cn(
            "mt-2 rounded-xl border p-3",
            todayStr === selectedDayStr ? "border-primary/40 bg-primary/5" : "border-border"
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold capitalize text-sm">
                {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedBlocks.length === 0
                  ? "Sin tareas"
                  : `${selectedBlocks.length} tarea${selectedBlocks.length !== 1 ? "s" : ""}`}
              </p>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => onDayClick(selectedDay)}
                className="text-xs text-primary border border-primary/40 rounded-lg px-2 py-1 hover:bg-primary/10 transition-colors"
              >
                Ver día
              </button>
              <button
                onClick={() => onAddBlock(selectedDay)}
                className="flex items-center gap-1 text-xs bg-primary text-primary-foreground rounded-lg px-2 py-1 hover:bg-primary/90 transition-colors"
              >
                <Plus className="h-3 w-3" /> Añadir
              </button>
            </div>
          </div>

          {selectedBlocks.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No hay tareas este día</p>
              <button
                onClick={() => onAddBlock(selectedDay)}
                className="mt-2 text-xs text-primary hover:underline"
              >
                + Añadir bloque
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedBlocks.map((block) => (
                <div
                  key={block.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border",
                    typeColors[block.type] ?? typeColors.otro,
                    block.completed && "opacity-50"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", block.completed && "line-through")}>
                      {block.title}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{block.startTime} – {block.endTime}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => onToggleComplete(block.id)}
                      className="p-1.5 rounded-md hover:bg-white/20 text-green-600"
                      title="Completar"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteBlock(block.id)}
                      className="p-1.5 rounded-md hover:bg-white/20 text-destructive"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── DESKTOP: 7 columnas ──────────────────────────────────────────────── */}
      <div className="hidden md:grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          const dayStr = day.toISOString().split("T")[0]
          const isToday = dayStr === todayStr
          const dayBlocks = blocks
            .filter((b) => b.date === dayStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))

          return (
            <div key={dayStr} className="flex flex-col min-w-0">
              {/* Cabecera */}
              <button
                onClick={() => onDayClick(day)}
                className={cn(
                  "w-full text-center px-1 py-2 rounded-t-lg border border-b-0 transition-colors hover:bg-muted/60",
                  isToday ? "border-primary/40 bg-primary/8" : "border-border bg-muted/20"
                )}
              >
                <span className="block text-[11px] text-muted-foreground font-medium uppercase">
                  {dayNames[idx]}
                </span>
                <span className={cn("text-sm font-bold", isToday && "text-primary")}>
                  {format(day, "d")}
                </span>
              </button>

              {/* Cuerpo */}
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
                          <span className={cn("flex-1 font-medium leading-snug break-words", block.completed && "line-through")}>
                            {block.title}
                          </span>
                          <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => onToggleComplete(block.id)} className="text-green-600 hover:text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                            </button>
                            <button onClick={() => onDeleteBlock(block.id)} className="text-destructive">
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
                      className="w-full text-xs text-muted-foreground/50 hover:text-primary flex items-center justify-center py-1 transition-colors"
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
    </>
  )
}
