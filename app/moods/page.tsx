"use client"

import { useState, useEffect } from "react"
import { fetchWithCache, invalidateCache } from "@/lib/client-cache"
import { MoodTracker } from "@/components/mood-tracker"
import { MoodHistory } from "@/components/mood-history"
import type { Mood } from "@/lib/types"
import { AppLayout } from "@/components/app-layout"

export default function MoodsPage() {
  const [moods, setMoods] = useState<Mood[]>([])
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadMoods = async (invalidate = false) => {
    try {
      if (invalidate) {
        invalidateCache("/api/moods")
        invalidateCache("/api/user/data")
      }
      const data = await fetchWithCache<{ moods: any[] }>("/api/moods")

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
      setLoadError(null)
    } catch (error: any) {
      console.error("Error cargando moods:", error)
      setLoadError(error?.message || "No se pudieron cargar los registros")
    }
  }

  useEffect(() => {
    loadMoods()
  }, [])

  const convertMoodType = (type: string): Mood["mood"] => {
    if (!type) return "neutral"
    const lowerType = type.toLowerCase()
    if (lowerType.includes("muy-mal") || lowerType === "muy-mal") return "muy-mal"
    if (lowerType.includes("excelente") || lowerType.includes("enfocado") || lowerType.includes("energético") || lowerType.includes("peak")) return "excelente"
    if (lowerType.includes("bien") || lowerType.includes("productivo") || lowerType.includes("motivado")) return "bien"
    if (lowerType.includes("mal") || lowerType.includes("cansado") || lowerType.includes("lento")) return "mal"
    if (lowerType.includes("muy")) return "muy-mal"
    return "neutral"
  }

  const handleSubmit = async (moodData: Omit<Mood, "id" | "timestamp">) => {
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const res = await fetch("/api/moods", {
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

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const msg = data.error || `Error ${res.status}`
        const detail = data.detail ? ` — ${data.detail}` : ""
        setSaveError(`${msg}${detail}`)
        return
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      await loadMoods(true)
    } catch (error: any) {
      console.error("Error guardando mood:", error)
      setSaveError("Error de conexión. Intenta de nuevo.")
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

            {saveSuccess && (
              <div className="p-3 rounded-lg border border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400 text-sm font-medium">
                Estado de ánimo guardado exitosamente
              </div>
            )}

            {saveError && (
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm font-medium">
                Error al guardar: {saveError}
              </div>
            )}

            {loadError && (
              <div className="p-3 rounded-lg border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400 text-sm">
                Error al cargar registros: {loadError}
              </div>
            )}

            <MoodHistory moods={moods} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
