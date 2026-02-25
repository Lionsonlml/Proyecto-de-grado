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

  // Calcular tendencia usando regresión lineal simple
  const calculateTrend = () => {
    if (recentMoods.length < 3) return 0
    
    // Convertir moods a valores numéricos con timestamps
    const moodData = recentMoods.map((mood, index) => ({
      value: moodValues[mood.mood],
      time: index, // Usar índice como tiempo (más reciente = mayor índice)
      timestamp: new Date(mood.timestamp).getTime()
    }))
    
    // Ordenar por timestamp para asegurar orden cronológico
    moodData.sort((a, b) => a.timestamp - b.timestamp)
    
    // Calcular regresión lineal simple
    const n = moodData.length
    const sumX = moodData.reduce((sum, d) => sum + d.time, 0)
    const sumY = moodData.reduce((sum, d) => sum + d.value, 0)
    const sumXY = moodData.reduce((sum, d) => sum + d.time * d.value, 0)
    const sumXX = moodData.reduce((sum, d) => sum + d.time * d.time, 0)
    
    // Pendiente de la línea de regresión
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
    
    // Si la pendiente es muy pequeña, considerar estable
    if (Math.abs(slope) < 0.1) return 0
    
    return slope
  }
  
  const trend = calculateTrend()

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
              <span className="text-sm font-medium">
                {trend > 0.2 ? "Mejorando" : trend < -0.2 ? "Bajando" : "Estable"}
              </span>
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
