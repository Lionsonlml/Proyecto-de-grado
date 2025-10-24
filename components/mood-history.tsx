"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { Mood } from "@/lib/types"
import { Frown, Meh, Smile, Laugh, Angry, Battery, Focus, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface MoodHistoryProps {
  moods: Mood[]
}

const moodConfig = {
  "muy-mal": { label: "Muy Mal", icon: Angry, color: "text-red-600 bg-red-50 dark:bg-red-950" },
  mal: { label: "Mal", icon: Frown, color: "text-orange-600 bg-orange-50 dark:bg-orange-950" },
  neutral: { label: "Neutral", icon: Meh, color: "text-yellow-600 bg-yellow-50 dark:bg-yellow-950" },
  bien: { label: "Bien", icon: Smile, color: "text-green-600 bg-green-50 dark:bg-green-950" },
  excelente: { label: "Excelente", icon: Laugh, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950" },
}

export function MoodHistory({ moods }: MoodHistoryProps) {
  const sortedMoods = [...moods].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de Estados</CardTitle>
        <CardDescription>Tus últimos registros de ánimo</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedMoods.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay registros aún</p>
        ) : (
          <div className="space-y-3">
            {sortedMoods.slice(0, 10).map((mood) => {
              const config = moodConfig[mood.mood]
              const Icon = config.icon
              const date = new Date(mood.timestamp)

              return (
                <div
                  key={mood.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                >
                  <div className={cn("p-3 rounded-full", config.color)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{config.label}</h4>
                      <span className="text-sm text-muted-foreground">
                        {date.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} a las{" "}
                        {date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="flex gap-3 flex-wrap">
                      <Badge variant="secondary" className="gap-1">
                        <Battery className="h-3 w-3" />
                        Energía: {mood.energy}/5
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Focus className="h-3 w-3" />
                        Concentración: {mood.focus}/5
                      </Badge>
                      <Badge variant="secondary" className="gap-1">
                        <Zap className="h-3 w-3" />
                        Estrés: {mood.stress}/5
                      </Badge>
                    </div>

                    {mood.notes && <p className="text-sm text-muted-foreground italic">{mood.notes}</p>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
