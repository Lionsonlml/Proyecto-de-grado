"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, Loader2 } from "lucide-react"

export function PatternAnalysis() {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const analyzePatterns = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          analysisType: "patterns",
        }),
      })

      if (!response.ok) throw new Error("Error al analizar")

      const data = await response.json()
      console.log("Pattern analysis data:", data)
      
      setAnalysis(data.parsed || { text: data.response || "Sin respuesta del modelo" })
    } catch (error) {
      console.error(error)
      setAnalysis({ error: "Error al obtener análisis" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600" />
          Análisis de Patrones
        </CardTitle>
        <CardDescription>Detecta automáticamente tus horas más productivas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={analyzePatterns} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            "Analizar Patrones"
          )}
        </Button>

        {analysis && (
          <div className="space-y-3">
            {analysis.error ? (
              <p className="text-sm text-destructive">{analysis.error}</p>
            ) : (
              <>
                {analysis.patterns && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Patrones Detectados</h4>
                    <ul className="text-sm space-y-1">
                      {analysis.patterns.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.optimal_times && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <h4 className="font-semibold text-sm mb-2">Horarios Óptimos</h4>
                    <div className="text-sm space-y-1">
                      {Object.entries(analysis.optimal_times).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.text && (
                  <div className="p-3 bg-muted rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap">{analysis.text}</pre>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

