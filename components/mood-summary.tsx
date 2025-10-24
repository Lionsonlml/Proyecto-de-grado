"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Mood } from "@/lib/types"
import { Smile, TrendingUp, TrendingDown } from "lucide-react"

interface MoodSummaryProps {
  moods: Mood[]
}

export function MoodSummary({ moods }: MoodSummaryProps) {
  const recentMoods = moods.slice(-7)

  if (recentMoods.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Estado de Ánimo</CardTitle>
          <CardDescription>Resumen de tu bienestar</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">No hay registros de mood aún</p>
        </CardContent>
      </Card>
    )
  }

  const moodValues = { "muy-mal": 1, mal: 2, neutral: 3, bien: 4, excelente: 5 }
  const avgMood = recentMoods.reduce((sum, m) => sum + moodValues[m.mood], 0) / recentMoods.length
  const avgEnergy = recentMoods.reduce((sum, m) => sum + m.energy, 0) / recentMoods.length
  const avgFocus = recentMoods.reduce((sum, m) => sum + m.focus, 0) / recentMoods.length
  const avgStress = recentMoods.reduce((sum, m) => sum + m.stress, 0) / recentMoods.length

  const getMoodLabel = (value: number) => {
    if (value >= 4.5) return "Excelente"
    if (value >= 3.5) return "Bien"
    if (value >= 2.5) return "Neutral"
    if (value >= 1.5) return "Mal"
    return "Muy Mal"
  }

  const trend =
    recentMoods.length >= 2 ? moodValues[recentMoods[recentMoods.length - 1].mood] - moodValues[recentMoods[0].mood] : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smile className="h-5 w-5" />
          Estado de Ánimo
        </CardTitle>
        <CardDescription>Últimos 7 registros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{getMoodLabel(avgMood)}</p>
            <p className="text-sm text-muted-foreground">Promedio general</p>
          </div>
          {trend !== 0 && (
            <div className={`flex items-center gap-1 ${trend > 0 ? "text-green-600" : "text-red-600"}`}>
              {trend > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              <span className="text-sm font-medium">{trend > 0 ? "Mejorando" : "Bajando"}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">{avgEnergy.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Energía</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{avgFocus.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Concentración</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{avgStress.toFixed(1)}</p>
            <p className="text-xs text-muted-foreground">Estrés</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
