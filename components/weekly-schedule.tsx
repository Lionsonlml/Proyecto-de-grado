"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TimeBlock } from "@/lib/types"
import { cn } from "@/lib/utils"

interface WeeklyScheduleProps {
  startDate: Date
  blocks: TimeBlock[]
}

export function WeeklySchedule({ startDate, blocks }: WeeklyScheduleProps) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    return date
  })

  const getBlocksForDay = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0]
    return blocks.filter((b) => b.date === dateStr).sort((a, b) => a.startTime.localeCompare(b.startTime))
  }

  const typeColors = {
    tarea: "bg-blue-500",
    descanso: "bg-green-500",
    reunion: "bg-purple-500",
    otro: "bg-gray-500",
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vista Semanal</CardTitle>
        <CardDescription>
          {days[0].toLocaleDateString("es-ES", { day: "numeric", month: "short" })} -{" "}
          {days[6].toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {days.map((day) => {
            const dayBlocks = getBlocksForDay(day)
            const isToday = day.toDateString() === new Date().toDateString()

            return (
              <div
                key={day.toISOString()}
                className={cn("border rounded-lg p-3 min-h-[200px]", isToday && "border-primary border-2 bg-primary/5")}
              >
                <div className="text-center mb-3">
                  <div className="text-xs font-medium text-muted-foreground uppercase">
                    {day.toLocaleDateString("es-ES", { weekday: "short" })}
                  </div>
                  <div className={cn("text-lg font-bold", isToday && "text-primary")}>
                    {day.toLocaleDateString("es-ES", { day: "numeric" })}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayBlocks.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Sin actividades</p>
                  ) : (
                    dayBlocks.map((block) => (
                      <div
                        key={block.id}
                        className={cn(
                          "p-2 rounded text-xs space-y-1",
                          block.completed ? "opacity-50" : "",
                          block.type === "tarea" && "bg-blue-500/10 border border-blue-500/20",
                          block.type === "descanso" && "bg-green-500/10 border border-green-500/20",
                          block.type === "reunion" && "bg-purple-500/10 border border-purple-500/20",
                          block.type === "otro" && "bg-gray-500/10 border border-gray-500/20",
                        )}
                      >
                        <div className="font-semibold truncate" title={block.title}>
                          {block.title}
                        </div>
                        <div className="text-muted-foreground">
                          {block.startTime.slice(0, 5)} - {block.endTime.slice(0, 5)}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {dayBlocks.length > 0 && (
                  <div className="mt-3 pt-2 border-t">
                    <div className="flex gap-1 justify-center">
                      {Object.entries(
                        dayBlocks.reduce(
                          (acc, block) => {
                            acc[block.type] = (acc[block.type] || 0) + 1
                            return acc
                          },
                          {} as Record<string, number>,
                        ),
                      ).map(([type, count]) => (
                        <div key={type} className="flex items-center gap-1">
                          <div className={cn("w-2 h-2 rounded-full", typeColors[type as keyof typeof typeColors])} />
                          <span className="text-xs">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
