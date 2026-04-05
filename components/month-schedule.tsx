"use client"

import type { TimeBlock } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
} from "date-fns"
import { es } from "date-fns/locale"

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

const weekDayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

export function MonthSchedule({ month, blocks, onDayClick }: MonthScheduleProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <div>
      {/* Cabecera con nombres de día */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayNames.map((d) => (
          <div
            key={d}
            className="text-center text-xs font-medium text-muted-foreground py-2"
          >
            {d}
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
          const extraCount = dayBlocks.length - 3

          return (
            <button
              key={dayStr}
              onClick={() => onDayClick(day)}
              className={cn(
                "bg-background text-left p-1.5 min-h-[84px] transition-colors hover:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary/40",
                !isCurrentMonth && "opacity-35",
                isToday && "bg-primary/5 ring-1 ring-inset ring-primary/30"
              )}
            >
              {/* Número del día */}
              <span
                className={cn(
                  "text-xs font-semibold inline-flex items-center justify-center w-5 h-5 rounded-full mb-1",
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                )}
              >
                {format(day, "d")}
              </span>

              {/* Tareas del día */}
              <div className="space-y-px">
                {dayBlocks.slice(0, 3).map((block) => (
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
    </div>
  )
}
