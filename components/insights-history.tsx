"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { History, TrendingUp, Lightbulb, Calendar, ChevronDown, ChevronUp } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"

export function InsightsHistory() {
  const [insights, setInsights] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    loadInsights()
  }, [])

  const loadInsights = async () => {
    try {
      const response = await fetch("/api/insights?limit=20")
      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights || [])
      }
    } catch (error) {
      console.error("Error cargando historial:", error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "patterns": return <TrendingUp className="h-4 w-4" />
      case "recommendations": return <Lightbulb className="h-4 w-4" />
      case "schedule": return <Calendar className="h-4 w-4" />
      default: return <History className="h-4 w-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "patterns": return "Patrones"
      case "recommendations": return "Recomendaciones"
      case "schedule": return "Horario"
      default: return type
    }
  }

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "patterns": return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "recommendations": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20"
      case "schedule": return "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
      default: return ""
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Historial de Análisis
        </CardTitle>
        <CardDescription>Tus últimos 20 insights generados por Timewize AI</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
        ) : insights.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aún no tienes análisis guardados</p>
            <p className="text-sm mt-2">Usa las funciones de análisis para generar insights</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-3">
              {insights.map((insight) => {
                const isExpanded = expandedId === insight.id
                const createdDate = insight.created_at ? new Date(insight.created_at) : new Date()
                
                return (
                  <div
                    key={insight.id}
                    className="border rounded-lg p-4 hover:border-primary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${getTypeBadgeColor(insight.analysis_type)}`}>
                          {getTypeIcon(insight.analysis_type)}
                        </div>
                        <div>
                          <Badge variant="outline" className={getTypeBadgeColor(insight.analysis_type)}>
                            {getTypeLabel(insight.analysis_type)}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(createdDate, { addSuffix: true, locale: es })}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 bg-muted/50 rounded-md">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Respuesta:</p>
                        <div className={`text-sm ${!isExpanded && "line-clamp-3"}`}>
                          <pre className="whitespace-pre-wrap font-sans">
                            {insight.response || "Sin respuesta"}
                          </pre>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => toggleExpand(insight.id)}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="h-3 w-3 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3 w-3 mr-1" />
                            Ver completo
                          </>
                        )}
                      </Button>

                      {isExpanded && insight.prompt && (
                        <div className="p-3 bg-muted rounded-md mt-2">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Prompt enviado:</p>
                          <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                            {insight.prompt}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}

