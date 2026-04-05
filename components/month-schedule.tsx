"use client"

import type { TimeBlock } from "@/lib/types"
import { cn } from "@/lib/utils"
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format } from "date-fns"

interface MonthScheduleProps {
  month: Date
  blocks: TimeBlock[]
  onDayClick: (date: Date) => void
}

const typeColors: Record<string, string> = {
  tarea: "bg-blue-500 text-white",
  descanso: "bg-green-500 text-white",
  reunion: "bg-purple-500 text-white",
  otro: "bg-gray-500 text-white",
}

const dotColors: Record<string, string> = {
  tarea: "bg-blue-500",
  descanso: "bg-green-500",
  reunion: "bg-purple-500",
  otro: "bg-gray-500",
}

// Abreviaciones: 2 letras en móvil, 3 letras en desktop
const weekDayFull = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
const weekDayShort = ["L", "M", "X", "J", "V", "S", "D"]

export function MonthSchedule({ month, blocks, onDayClick }: MonthScheduleProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div>
      {/* Cabecera con nombres de día — 2 versiones según tamaño */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayFull.map((d, i) => (
          <div key={d} className="text-center py-1.5">
            <span className="hidden sm:inline text-xs font-medium text-muted-foreground">{d}</span>
            <span className="sm:hidden text-xs font-medium text-muted-foreground">{weekDayShort[i]}</span>
          </div>
        ))}
      </div>

      {/* Grilla de días */}
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border border-border">
        {days.map((day) => {
          const dayStr = day.toISOString().split("T")[0]
          const isCurrentMonth = day.getMonth() === month.getMonth()
          const isToday = dayStr === todayStr
          const dayBlocks = blocks
            .filter((b) => b.date === dayStr)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))
          const extraCount = Math.max(0, dayBlocks.length - 2)

          return (
            <button
              key={dayStr}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-background text-left transition-colors hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40",
                // altura: compacta en móvil, normal en desktop
                "min-h-[56px] sm:min-h-[80px]",
                // padding: pequeño en móvil, normal en desktop
                "p-1 sm:p-1.5",
                !isCurrentMonth && "opacity-35",
                isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30"
              )}
            >
              {/* Número del día */}
              <span
                className={cn(
                  "inline-flex items-center justify-center rounded-full font-semibold",
                  // tamaño: pequeño en móvil, normal en desktop
                  "w-5 h-5 text-[11px] sm:w-5 sm:h-5 sm:text-xs",
                  "mb-0.5",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* MÓVIL: solo puntos de colores */}
              <div className="flex gap-0.5 flex-wrap sm:hidden">
                {dayBlocks.slice(0, 5).map((block) => (
                  <span
                    key={block.id}
                    className={cn("w-1.5 h-1.5 rounded-full", dotColors[block.type] ?? "bg-gray-400")}
                  />
                ))}
              </div>

              {/* DESKTOP: nombre de tareas */}
              <div className="hidden sm:block space-y-px">
                {dayBlocks.slice(0, 2).map((block) => (
                  <div
                    key={block.id}
                    className={cn(
                      "text-[10px] px-1 py-px rounded truncate font-medium",
                      typeColors[block.type] ?? typeColors.otro,
                      block.completed && "opacity-50"
                    )}
                    title={`${block.startTime} ${block.title}`}
                  >
                    {block.startTime} {block.title}
                  </div>
                ))}
                {extraCount > 0 && (
                  <div className="text-[10px] text-muted-foreground pl-0.5 font-medium">
                    +{extraCount} más
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Leyenda de colores (solo desktop) */}
      <div className="hidden sm:flex gap-4 mt-3 flex-wrap">
        {Object.entries({ tarea: "Tarea", reunion: "Reunión", descanso: "Descanso", otro: "Otro" }).map(([key, label]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("w-2.5 h-2.5 rounded-full", dotColors[key])} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
