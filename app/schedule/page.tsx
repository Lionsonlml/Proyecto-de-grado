"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DailySchedule } from "@/components/daily-schedule"
import type { TimeBlock, Task } from "@/lib/types"
import { ChevronLeft, ChevronRight, Sparkles, Calendar, Loader2 } from "lucide-react"
import { AppLayout } from "@/components/app-layout"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [optimizedBlocks, setOptimizedBlocks] = useState<TimeBlock[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<"original" | "optimized">("original")
  const [optimizing, setOptimizing] = useState(false)

  const dateStr = currentDate.toISOString().split("T")[0]

  const loadData = async () => {
    try {
      const res = await fetch(`/api/user/data?date=${dateStr}`)
      if (!res.ok) return
      const data = await res.json()

      // Mapear tareas a bloques originales
      const taskBlocks: TimeBlock[] = (data.tasks || []).map((t: any) => ({
        id: `db-${t.id}`,
        taskId: `db-${t.id}`,
        title: t.title,
        startTime: `${String(t.hour || 9).padStart(2, "0")}:00`,
        endTime: `${String(Math.min((t.hour || 9) + Math.max(1, Math.round((t.duration || 60) / 60)), 23)).padStart(2, "0")}:00`,
        date: t.date,
        type: "tarea" as const,
        completed: !!t.completed,
      }))

      setBlocks(taskBlocks.filter((b) => b.date === dateStr))
      
      setTasks(
        (data.tasks || []).map((t: any) => ({
          id: `db-${t.id}`,
          title: t.title,
          description: t.description ?? undefined,
          category: "trabajo" as const,
          priority: "media" as const,
          status: t.completed ? "completada" as const : "pendiente" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      )
    } catch (e) {
      console.error("Error cargando datos:", e)
    }
  }

  useEffect(() => {
    loadData()
  }, [currentDate])

  const handleOptimize = async () => {
    setOptimizing(true)
    try {
      const response = await fetch("/api/schedule/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: dateStr }),
      })

      if (!response.ok) throw new Error("Error optimizando")

      const data = await response.json()
      
      // Convertir schedule optimizado a bloques
      const optimized: TimeBlock[] = (data.optimizedSchedule || []).map((item: any, index: number) => ({
        id: `opt-${index}`,
        title: item.task,
        startTime: item.time,
        endTime: calculateEndTime(item.time, item.duration || 60),
        date: dateStr,
        type: "tarea" as const,
        completed: false,
      }))

      setOptimizedBlocks(optimized)
      setView("optimized")
    } catch (error) {
      console.error("Error optimizando horario:", error)
      alert("Error al optimizar el horario. Verifica que haya tareas pendientes.")
    } finally {
      setOptimizing(false)
    }
  }

  const calculateEndTime = (startTime: string, durationMin: number) => {
    const [hour, minute] = startTime.split(':').map(Number)
    const endMinutes = minute + durationMin
    const endHour = Math.min(23, hour + Math.floor(endMinutes / 60))
    const endMin = endMinutes % 60
    return `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`
  }

  const navigateDay = (direction: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + direction)
    setCurrentDate(newDate)
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-background pt-20 pb-20 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Horarios</h1>
              <p className="text-muted-foreground">Organiza tu tiempo de forma visual</p>
            </div>
            <Button onClick={handleOptimize} disabled={optimizing} className="gap-2 w-full sm:w-auto">
              {optimizing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Optimizando con IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Optimizar con IA
                </>
              )}
            </Button>
          </div>

          <Tabs value={view} onValueChange={(v) => setView(v as "original" | "optimized")}>
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="original" className="flex-1 sm:flex-none">
                <Calendar className="h-4 w-4 mr-2" />
                Horario Original
              </TabsTrigger>
              <TabsTrigger value="optimized" disabled={optimizedBlocks.length === 0} className="flex-1 sm:flex-none">
                <Sparkles className="h-4 w-4 mr-2" />
                Optimizado por IA
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center justify-between mb-4 gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDay(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">
                      {format(currentDate, "dd 'de' MMMM, yyyy", { locale: es })}
                    </span>
                    <span className="sm:hidden">
                      {format(currentDate, "dd/MM/yyyy")}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={currentDate}
                    onSelect={(date) => date && setCurrentDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              <Button variant="outline" size="icon" onClick={() => navigateDay(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <TabsContent value="original" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Horario Original</CardTitle>
                  <CardDescription>Tus tareas en el horario que estableciste</CardDescription>
                </CardHeader>
                <CardContent>
                  <DailySchedule
                    date={currentDate}
                    blocks={blocks}
                    tasks={tasks}
                    onAddBlock={() => {}}
                    onEditBlock={() => {}}
                    onDeleteBlock={() => {}}
                    onToggleComplete={() => {}}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="optimized" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Horario Optimizado por IA
                  </CardTitle>
                  <CardDescription>
                    Gemini ha reorganizado tus tareas según tus patrones de energía para máxima productividad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {optimizedBlocks.length > 0 ? (
                    <DailySchedule
                      date={currentDate}
                      blocks={optimizedBlocks}
                      tasks={tasks}
                      onAddBlock={() => {}}
                      onEditBlock={() => {}}
                      onDeleteBlock={() => {}}
                      onToggleComplete={() => {}}
                    />
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Haz clic en "Optimizar con Gemini" para generar un horario optimizado</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  )
}
