"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, Loader2 } from "lucide-react"

export function GeminiDemo() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "patterns" }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Error al analizar con Gemini")
      }

      const data = await response.json()
      console.log("GeminiDemo data:", data)

      setResult(data)
    } catch (error) {
      console.error("Error:", error)
      setResult({ error: error instanceof Error ? error.message : "Error desconocido" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Prueba Timewize AI
        </CardTitle>
        <CardDescription>Analiza datos de ejemplo con inteligencia artificial</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleAnalyze} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            "Analizar con IA"
          )}
        </Button>

        {result && (
          <div className="space-y-2">
            {result.error ? (
              <div className="p-4 bg-destructive/10 text-destructive rounded-lg text-sm">{result.error}</div>
            ) : (
              <>
                {/* Panel de Verificación */}
                <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
                    ✅ Verificación de Datos Enviados al Modelo
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-background rounded">
                      <div className="font-medium">Modelo:</div>
                      <div className="text-green-600">{result.model}</div>
                    </div>
                    <div className="p-2 bg-background rounded">
                      <div className="font-medium">Duración:</div>
                      <div className="text-green-600">{result.durationMs} ms</div>
                    </div>
                    {result.stats && (
                      <>
                        <div className="p-2 bg-background rounded">
                          <div className="font-medium">Tareas (BD):</div>
                          <div className="text-green-600">{result.stats.counts.tasks} tareas reales</div>
                        </div>
                        <div className="p-2 bg-background rounded">
                          <div className="font-medium">Moods (BD):</div>
                          <div className="text-green-600">{result.stats.counts.moods} registros reales</div>
                        </div>
                        <div className="col-span-2 p-2 bg-background rounded">
                          <div className="font-medium">Fuente de Datos:</div>
                          <div className="text-green-600">🗄️ {result.stats.source} (no localStorage)</div>
                        </div>
                        <div className="col-span-2 p-2 bg-background rounded">
                          <div className="font-medium">Fecha de análisis:</div>
                          <div className="text-green-600">{result.stats.date}</div>
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-green-700 dark:text-green-400 mt-2">
                    ℹ️ Estos son los datos reales de tu base de datos que se enviaron al modelo de IA
                  </p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Prompt enviado al modelo:</p>
                  <pre className="text-xs whitespace-pre-wrap max-h-60 overflow-y-auto">{result.prompt}</pre>
                </div>
                <div className="p-4 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-2">Respuesta de IA ({result.response?.length || 0} caracteres):</p>
                  {result.parsed ? (
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result.parsed, null, 2)}</pre>
                  ) : (
                    <pre className="text-xs whitespace-pre-wrap">{result.response}</pre>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
