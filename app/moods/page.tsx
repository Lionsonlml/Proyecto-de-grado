"use client"

import { useState, useEffect } from "react"
import { fetchWithCache, invalidateCache } from "@/lib/client-cache"
import { MoodTracker } from "@/components/mood-tracker"
import { MoodHistory } from "@/components/mood-history"
import type { Mood } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"

export default function MoodsPage() {
  const [moods, setMoods] = useState<Mood[]>([])

  const loadMoods = async (invalidate = false) => {
    try {
      if (invalidate) {
        invalidateCache("/api/moods")
        invalidateCache("/api/user/data") // también invalidar caché del dashboard
      }
      const data = await fetchWithCache<{ moods: any[] }>("/api/moods")

      // Convertir moods de BD al formato de Mood
      const convertedMoods: Mood[] = (data.moods || []).map((m: any) => ({
        id: String(m.id),
        mood: convertMoodType(m.type),
        energy: m.energy || 3,
        focus: m.focus || 3,
        stress: m.stress || 3,
        notes: m.notes || undefined,
        timestamp: m.created_at || new Date().toISOString(),
      }))
      
      setMoods(convertedMoods)
    } catch (error) {
      console.error("Error cargando moods:", error)
    }
  }

  useEffect(() => {
    loadMoods()
  }, [])

  const convertMoodType = (type: string): Mood["mood"] => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes("excelente") || lowerType.includes("enfocado") || lowerType.includes("energético") || lowerType.includes("peak")) return "excelente"
    if (lowerType.includes("bien") || lowerType.includes("productivo") || lowerType.includes("motivado")) return "bien"
    if (lowerType.includes("mal") || lowerType.includes("cansado") || lowerType.includes("lento")) return "mal"
    if (lowerType.includes("muy")) return "muy-mal"
    return "neutral"
  }

  const handleSubmit = async (moodData: Omit<Mood, "id" | "timestamp">) => {
    try {
      await fetch("/api/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          energy: moodData.energy,
          focus: moodData.focus,
          stress: moodData.stress,
          type: moodData.mood,
          notes: moodData.notes,
        }),
      })

      await loadMoods(true)
    } catch (error) {
      console.error("Error guardando mood:", error)
    }
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pt-20 pb-20 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">Estados de Ánimo</h1>
            <p className="text-sm md:text-base text-muted-foreground">Registra y analiza cómo te sientes</p>
          </div>

          <div className="grid gap-4 md:gap-6">
            <MoodTracker onSubmit={handleSubmit} />
            <MoodHistory moods={moods} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
