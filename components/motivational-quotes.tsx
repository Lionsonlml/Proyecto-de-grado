"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Mood } from "@/lib/types"

interface MotivationalQuotesProps {
  moods: Mood[]
}

export function MotivationalQuotes({ moods }: MotivationalQuotesProps) {
  const [quote, setQuote] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [context, setContext] = useState<string>("")

  const generateQuote = async () => {
    if (moods.length === 0) return

    setLoading(true)
    try {
      // Ordenar moods por timestamp descendente para obtener el más reciente
      const sortedMoods = [...moods].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      const lastMood = sortedMoods[0] // El mood más reciente
      const energy = lastMood.energy
      const focus = lastMood.focus
      const stress = lastMood.stress
      const moodType = lastMood.mood

      const response = await fetch("/api/gemini/motivational", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentMoods: [lastMood],
          energy,
          focus,
          stress,
          moodType,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setQuote(data.quote)
        setContext(data.context)
      }
    } catch (error) {
      console.error("Error generando frase motivacional:", error)
      setQuote("¡Cada día es una nueva oportunidad para brillar! ✨")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (moods.length > 0) {
      generateQuote()
    }
  }, [moods])

  if (moods.length === 0) {
    return (
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>Registra tu estado de ánimo para recibir frases motivacionales personalizadas</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Frase del día
              </span>
            </div>
            
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Generando frase motivacional...</span>
              </div>
            ) : quote ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground leading-relaxed">
                  "{quote}"
                </p>
                {context && (
                  <p className="text-xs text-muted-foreground">
                    Basado en tu estado actual: {context.toLowerCase()}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Haz clic en el botón para generar una frase motivacional
              </p>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={generateQuote}
            disabled={loading}
            className="shrink-0 h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
