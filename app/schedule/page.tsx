"use client"

import { useState, useEffect, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DailySchedule } from "@/components/daily-schedule"
import { WeekSchedule } from "@/components/week-schedule"
import { MonthSchedule } from "@/components/month-schedule"
import type { TimeBlock, Task } from "@/lib/types"
import {
  ChevronLeft, ChevronRight, Sparkles, Calendar, Loader2, X,
  CalendarDays, CalendarRange, LayoutList, AlignJustify,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { AppLayout } from "@/components/app-layout"
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns"
import { es } from "date-fns/locale"
import { AiSourceBadge, type AiSource } from "@/components/ai-source-badge"

type CalendarView = "day" | "week" | "month"
type DayMode = "detailed" | "compact"

export default function SchedulePage() {
  // ── Vista actual ────────────────────────────────────────────────────────────
  const [calendarView, setCalendarView] = useState<CalendarView>("day")
  const [dayMode, setDayMode] = useState<DayMode>("detailed")

  // ── Fecha de referencia (sirve para todas las vistas) ────────────────────────
  const [currentDate, setCurrentDate] = useState(new Date())

  // ── Bloques (día) ────────────────────────────────────────────────────────────
  const [blocks, setBlocks] = useState<TimeBlock[]>([])
  const [allBlocks, setAllBlocks] = useState<TimeBlock[]>([]) // semana / mes
  const [tasks, setTasks] = useState<Task[]>([])

  // ── Optimizador IA ───────────────────────────────────────────────────────────
  const [optimizedBlocks, setOptimizedBlocks] = useState<TimeBlock[]>([])
  const [scheduleTab, setScheduleTab] = useState<"original" | "optimized">("original")
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeSource, setOptimizeSource] = useState<AiSource>("gemini")
  const [optimizeCachedAt, setOptimizeCachedAt] = useState<string | undefined>()
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)

  // ── Formulario "Agregar bloque" ──────────────────────────────────────────────
  const [showAddBlock, setShowAddBlock] = useState(false)
  const [addBlockDate, setAddBlockDate] = useState<string>("")
  const [addingBlock, setAddingBlock] = useState(false)
  const [addBlockMode, setAddBlockMode] = useState<"nueva" | "existente">("nueva")
  const [newBlockTitle, setNewBlockTitle] = useState("")
  const [newBlockHour, setNewBlockHour] = useState("9")
  const [newBlockDuration, setNewBlockDuration] = useState("60")
  const [newBlockType, setNewBlockType] = useState<TimeBlock["type"]>("tarea")
  // Para reagendar tarea existente
  const [rawTaskList, setRawTaskList] = useState<Array<{id: number, title: string, hour: number, duration: number, date: string}>>([])
  const [selectedExistingId, setSelectedExistingId] = useState<string>("")

  const { toast } = useToast()

  // ── Strings de fecha ────────────────────────────────────────────────────────
  const dateStr = currentDate.toISOString().split("T")[0]

  // ── Helpers: calcular tiempo de fin ─────────────────────────────────────────
  const calculateEndTime = (startTime: string, durationMin: number) => {
    const [hour, minute] = startTime.split(":").map(Number)
    const endMinutes = minute + durationMin
    const endHour = Math.min(23, hour + Math.floor(endMinutes / 60))
    const endMin = endMinutes % 60
    return `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`
  }

  // ── Mapear tarea de BD → TimeBlock ──────────────────────────────────────────
  const taskToBlock = (t: any): TimeBlock => ({
    id: `db-${t.id}`,
    taskId: `db-${t.id}`,
    title: t.title,
    startTime: `${String(t.hour || 9).padStart(2, "0")}:00`,
    endTime: `${String(Math.min((t.hour || 9) + Math.max(1, Math.round((t.duration || 60) / 60)), 23)).padStart(2, "0")}:00`,
    date: t.date,
    type: "tarea" as const,
    completed: !!t.completed,
  })

  // ── Carga de datos para vista DÍA ───────────────────────────────────────────
  const loadData = async () => {
    try {
      const res = await fetch(`/api/user/data?date=${dateStr}`)
      if (!res.ok) return
      const data = await res.json()
      const taskBlocks = (data.tasks || []).map(taskToBlock)
      setBlocks(taskBlocks.filter((b: TimeBlock) => b.date === dateStr))
      setTasks(
        (data.tasks || []).map((t: any) => ({
          id: `db-${t.id}`,
          title: t.title,
          description: t.description ?? undefined,
          category: (t.category || "personal") as Task["category"],
          priority: (t.priority || "media") as Task["priority"],
          status: t.completed ? ("completada" as const) : ("pendiente" as const),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }))
      )
    } catch (e) {
      console.error("Error cargando datos:", e)
    }
  }

  // ── Carga de datos para vista SEMANA / MES ───────────────────────────────────
  const loadAllData = async () => {
    try {
      const res = await fetch("/api/tasks")
      if (!res.ok) return
      const data = await res.json()
      const taskBlocks = (data.tasks || []).map(taskToBlock)
      setAllBlocks(taskBlocks)
    } catch (e) {
      console.error("Error cargando todas las tareas:", e)
    }
  }

  // ── Carga del último horario optimizado ─────────────────────────────────────
  useEffect(() => {
    const loadLastSchedule = async () => {
      try {
        const res = await fetch("/api/insights?type=schedule:optimize&limit=1")
        if (!res.ok) return
        const data = await res.json()
        const insights: any[] = data.insights || []
        if (insights.length === 0) return
        const last = insights[0]
        const scheduleItems: any[] = JSON.parse(last.response)
        if (!Array.isArray(scheduleItems) || scheduleItems.length === 0) return
        const today = new Date().toISOString().split("T")[0]
        const targetDate = last.metadata
          ? (() => { try { return JSON.parse(last.metadata)?.date || today } catch { return today } })()
          : today
        const optimized: TimeBlock[] = scheduleItems.map((item: any, index: number) => ({
          id: `opt-hist-${index}`,
          title: item.task || item.title || "",
          startTime: item.time || item.startTime || "09:00",
          endTime: item.endTime || calculateEndTime(item.time || item.startTime || "09:00", item.duration || 60),
          date: targetDate,
          type: "tarea" as const,
          completed: false,
        }))
        setOptimizedBlocks(optimized)
        setScheduleTab("optimized")
        setOptimizeSource("cache")
        setLastGeneratedAt(last.created_at as string)
      } catch {
        // ignorar
      }
    }
    loadLastSchedule()
  }, [])

  // ── Cargar según vista ───────────────────────────────────────────────────────
  useEffect(() => {
    if (calendarView === "day") {
      loadData()
    } else {
      loadAllData()
    }
  }, [currentDate, calendarView])

  // ── Optimizar horario con IA ─────────────────────────────────────────────────
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
      setOptimizeSource(data.source ?? "gemini")
      setOptimizeCachedAt(data.cachedAt)
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
      setScheduleTab("optimized")
    } catch (error) {
      console.error("Error optimizando horario:", error)
      toast({ title: "Error al optimizar el horario", variant: "destructive" })
    } finally {
      setOptimizing(false)
    }
  }

  // ── Navegación ───────────────────────────────────────────────────────────────
  const navigate = (direction: number) => {
    if (calendarView === "day") {
      setCurrentDate((d) => addDays(d, direction))
    } else if (calendarView === "week") {
      setCurrentDate((d) => addWeeks(d, direction))
    } else {
      setCurrentDate((d) => addMonths(d, direction))
    }
  }

  const goToToday = () => setCurrentDate(new Date())

  // ── Label del rango de fechas según vista ────────────────────────────────────
  const rangeLabel = () => {
    if (calendarView === "day") {
      return format(currentDate, "dd 'de' MMMM, yyyy", { locale: es })
    }
    if (calendarView === "week") {
      const wStart = startOfWeek(currentDate, { weekStartsOn: 1 })
      const wEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
      return `${format(wStart, "d MMM", { locale: es })} – ${format(wEnd, "d MMM yyyy", { locale: es })}`
    }
    return format(currentDate, "MMMM yyyy", { locale: es })
  }

  // ── Operaciones sobre bloques ────────────────────────────────────────────────
  const extractTaskId = (blockId: string): number | null => {
    const match = blockId.match(/^db-(\d+)$/)
    return match ? parseInt(match[1], 10) : null
  }

  const handleToggleComplete = async (blockId: string) => {
    const taskId = extractTaskId(blockId)
    if (!taskId) return
    const block = [...blocks, ...allBlocks].find((b) => b.id === blockId)
    if (!block) return
    const newCompleted = !block.completed
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, completed: newCompleted ? 1 : 0, status: newCompleted ? "completada" : "pendiente" }),
      })
      const toggle = (prev: TimeBlock[]) =>
        prev.map((b) => (b.id === blockId ? { ...b, completed: newCompleted } : b))
      setBlocks(toggle)
      setAllBlocks(toggle)
      toast({ title: newCompleted ? "Tarea completada" : "Tarea reanudada" })
    } catch {
      toast({ title: "Error al actualizar tarea", variant: "destructive" })
    }
  }

  const handleDeleteBlock = async (blockId: string) => {
    const taskId = extractTaskId(blockId)
    if (!taskId) return
    try {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setBlocks((prev) => prev.filter((b) => b.id !== blockId))
      setAllBlocks((prev) => prev.filter((b) => b.id !== blockId))
      toast({ title: "Tarea eliminada" })
    } catch {
      toast({ title: "Error al eliminar tarea", variant: "destructive" })
    }
  }

  // ── Cargar tareas para el formulario de reagendar ───────────────────────────
  const loadTasksForForm = async () => {
    try {
      const res = await fetch("/api/tasks")
      if (!res.ok) return
      const data = await res.json()
      setRawTaskList(
        (data.tasks || []).map((t: any) => ({
          id: t.id,
          title: t.title,
          hour: t.hour || 9,
          duration: t.duration || 60,
          date: t.date,
        }))
      )
    } catch {}
  }

  const openAddBlock = (date?: Date) => {
    const targetDate = date ? date.toISOString().split("T")[0] : dateStr
    setAddBlockDate(targetDate)
    setAddBlockMode("nueva")
    setNewBlockTitle("")
    setNewBlockHour("9")
    setNewBlockDuration("60")
    setNewBlockType("tarea")
    setSelectedExistingId("")
    setShowAddBlock(true)
    loadTasksForForm()
  }

  const handleSelectExistingTask = (taskId: string) => {
    setSelectedExistingId(taskId)
    const task = rawTaskList.find((t) => String(t.id) === taskId)
    if (task) {
      setNewBlockTitle(task.title)
      setNewBlockHour(String(task.hour))
      setNewBlockDuration(String(task.duration))
    }
  }

  const handleAddBlock = async (e: FormEvent) => {
    e.preventDefault()
    const hour = Math.max(0, Math.min(23, parseInt(newBlockHour) || 9))
    const targetDate = addBlockDate || dateStr

    setAddingBlock(true)
    try {
      if (addBlockMode === "existente" && selectedExistingId) {
        // Reagendar: actualizar hora y fecha de la tarea existente
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: parseInt(selectedExistingId), hour, date: targetDate }),
        })
        if (!res.ok) throw new Error()
        toast({ title: "Tarea reagendada correctamente" })
      } else {
        // Nueva tarea
        if (!newBlockTitle.trim()) return
        const duration = Math.max(1, parseInt(newBlockDuration) || 60)
        const categoryMap: Record<TimeBlock["type"], string> = {
          tarea: "personal", reunion: "trabajo", descanso: "salud", otro: "otro",
        }
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: newBlockTitle.trim(),
            category: categoryMap[newBlockType],
            priority: "media",
            status: "pendiente",
            duration,
            hour,
            date: targetDate,
          }),
        })
        if (!res.ok) throw new Error()
        toast({ title: "Bloque añadido correctamente" })
      }

      setShowAddBlock(false)
      if (calendarView === "day") await loadData()
      else await loadAllData()
    } catch {
      toast({ title: "Error al guardar el bloque", variant: "destructive" })
    } finally {
      setAddingBlock(false)
    }
  }

  // ── Formulario reutilizable (día y semana) ───────────────────────────────────
  const AddBlockForm = () => (
    <Card className="border-primary/50 mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">
              {addBlockMode === "existente" ? "Reagendar tarea" : "Nuevo bloque"}
            </CardTitle>
            {addBlockDate && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Fecha: {addBlockDate}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowAddBlock(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Toggle Nueva / Reagendar */}
        <div className="flex rounded-lg border border-border overflow-hidden w-full mb-4">
          <button
            type="button"
            onClick={() => { setAddBlockMode("nueva"); setSelectedExistingId(""); setNewBlockTitle("") }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              addBlockMode === "nueva"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            + Nueva tarea
          </button>
          <button
            type="button"
            onClick={() => setAddBlockMode("existente")}
            className={`flex-1 py-2 text-sm font-medium border-l border-border transition-colors ${
              addBlockMode === "existente"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            ↕ Reagendar existente
          </button>
        </div>

        <form onSubmit={handleAddBlock} className="space-y-3">
          {/* Selector de tarea existente */}
          {addBlockMode === "existente" ? (
            <div className="space-y-1.5">
              <Label>Selecciona una tarea</Label>
              <Select value={selectedExistingId} onValueChange={handleSelectExistingTask}>
                <SelectTrigger>
                  <SelectValue placeholder="Elige una tarea para reagendar..." />
                </SelectTrigger>
                <SelectContent>
                  {rawTaskList.length === 0 ? (
                    <SelectItem value="__empty" disabled>Sin tareas disponibles</SelectItem>
                  ) : (
                    rawTaskList.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.title}
                        <span className="ml-2 text-muted-foreground text-xs">
                          ({t.date} · {t.hour}:00)
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedExistingId && newBlockTitle && (
                <p className="text-xs text-muted-foreground px-1">
                  Tarea seleccionada: <strong>{newBlockTitle}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="block-title">Título</Label>
              <Input
                id="block-title"
                value={newBlockTitle}
                onChange={(e) => setNewBlockTitle(e.target.value)}
                placeholder="Nombre del bloque..."
                required
                autoFocus
              />
            </div>
          )}

          {/* Campos hora y duración */}
          <div className={`grid gap-3 ${addBlockMode === "nueva" ? "grid-cols-3" : "grid-cols-2"}`}>
            <div className="space-y-1.5">
              <Label htmlFor="block-hour">Hora (0-23)</Label>
              <Input
                id="block-hour"
                type="number"
                min="0"
                max="23"
                value={newBlockHour}
                onChange={(e) => setNewBlockHour(e.target.value)}
              />
            </div>
            {addBlockMode === "nueva" && (
              <div className="space-y-1.5">
                <Label htmlFor="block-duration">Duración (min)</Label>
                <Input
                  id="block-duration"
                  type="number"
                  min="1"
                  value={newBlockDuration}
                  onChange={(e) => setNewBlockDuration(e.target.value)}
                />
              </div>
            )}
            {addBlockMode === "nueva" && (
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={newBlockType} onValueChange={(v) => setNewBlockType(v as TimeBlock["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tarea">Tarea</SelectItem>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="descanso">Descanso</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {addBlockMode === "existente" && (
              <div className="space-y-1.5">
                <Label>Nueva duración (min)</Label>
                <Input
                  type="number"
                  min="1"
                  value={newBlockDuration}
                  onChange={(e) => setNewBlockDuration(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="submit"
              size="sm"
              disabled={
                addingBlock ||
                (addBlockMode === "nueva" && !newBlockTitle.trim()) ||
                (addBlockMode === "existente" && !selectedExistingId)
              }
            >
              {addingBlock && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
              {addBlockMode === "existente" ? "Reagendar" : "Guardar bloque"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddBlock(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="min-h-screen bg-background pt-20 pb-20 md:pt-8 md:pb-8">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Cabecera */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Horarios</h1>
              <p className="text-muted-foreground">Organiza tu tiempo de forma visual</p>
            </div>
            {calendarView === "day" && (
              <Button onClick={handleOptimize} disabled={optimizing} className="gap-2 w-full sm:w-auto">
                {optimizing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Optimizando con IA...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />{optimizedBlocks.length > 0 ? "Regenerar con IA" : "Optimizar con IA"}</>
                )}
              </Button>
            )}
          </div>

          {/* Selector de vista: Día / Semana / Mes */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex rounded-lg border border-border overflow-hidden w-fit">
              <button
                onClick={() => setCalendarView("day")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  calendarView === "day"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <Calendar className="h-3.5 w-3.5" />
                Día
              </button>
              <button
                onClick={() => setCalendarView("week")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-x border-border transition-colors ${
                  calendarView === "week"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Semana
              </button>
              <button
                onClick={() => setCalendarView("month")}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                  calendarView === "month"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5" />
                Mes
              </button>
            </div>

            {/* Modo detallado / compacto (solo en vista día) */}
            {calendarView === "day" && (
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                <button
                  onClick={() => setDayMode("detailed")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${
                    dayMode === "detailed"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                  title="Mostrar todas las horas"
                >
                  <AlignJustify className="h-3.5 w-3.5" />
                  Detallado
                </button>
                <button
                  onClick={() => setDayMode("compact")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-border transition-colors ${
                    dayMode === "compact"
                      ? "bg-secondary text-secondary-foreground"
                      : "hover:bg-muted text-muted-foreground"
                  }`}
                  title="Mostrar solo horas con tareas"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Compacto
                </button>
              </div>
            )}
          </div>

          {/* Navegación de fecha */}
          <div className="flex items-center justify-between mb-4 gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-2 flex-1 justify-center">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 capitalize">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">{rangeLabel()}</span>
                    <span className="sm:hidden">
                      {calendarView === "day"
                        ? format(currentDate, "dd/MM/yyyy")
                        : calendarView === "week"
                        ? format(startOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM") + " – " + format(endOfWeek(currentDate, { weekStartsOn: 1 }), "dd/MM")
                        : format(currentDate, "MMM yyyy", { locale: es })}
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

              <Button variant="ghost" size="sm" onClick={goToToday} className="text-xs text-muted-foreground">
                Hoy
              </Button>
            </div>

            <Button variant="outline" size="icon" onClick={() => navigate(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* ── VISTA DÍA ── */}
          {calendarView === "day" && (
            <Tabs value={scheduleTab} onValueChange={(v) => setScheduleTab(v as "original" | "optimized")}>
              <TabsList className="mb-4 w-full sm:w-auto">
                <TabsTrigger value="original" className="flex-1 sm:flex-none">
                  <Calendar className="h-4 w-4 mr-2" />
                  Horario Original
                </TabsTrigger>
                <TabsTrigger value="optimized" disabled={optimizedBlocks.length === 0} className="flex-1 sm:flex-none">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Optimizado por IA
                </TabsTrigger>
              </TabsList>

              <TabsContent value="original" className="space-y-4">
                {showAddBlock && <AddBlockForm />}

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
                      compact={dayMode === "compact"}
                      onAddBlock={() => openAddBlock()}
                      onEditBlock={() => toast({ title: "Edita la tarea desde la sección Tareas" })}
                      onDeleteBlock={handleDeleteBlock}
                      onToggleComplete={handleToggleComplete}
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
                      {optimizedBlocks.length > 0 && (
                        <AiSourceBadge source={optimizeSource} cachedAt={optimizeCachedAt} />
                      )}
                    </CardTitle>
                    <CardDescription>
                      Gemini ha reorganizado tus tareas según tus patrones de energía para máxima productividad
                      {lastGeneratedAt && (
                        <span className="block mt-1 text-xs opacity-70">
                          Generado el {format(new Date(lastGeneratedAt), "dd 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {optimizedBlocks.length > 0 ? (
                      <DailySchedule
                        date={currentDate}
                        blocks={optimizedBlocks}
                        tasks={tasks}
                        compact={dayMode === "compact"}
                        onAddBlock={() => {}}
                        onEditBlock={() => {}}
                        onDeleteBlock={() => {}}
                        onToggleComplete={() => {}}
                      />
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>Haz clic en "Optimizar con IA" para generar un horario optimizado</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}

          {/* ── VISTA SEMANA ── */}
          {calendarView === "week" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Vista Semanal</CardTitle>
                    <CardDescription className="capitalize">
                      {format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d 'de' MMMM", { locale: es })}
                      {" – "}
                      {format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d 'de' MMMM, yyyy", { locale: es })}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {showAddBlock && <AddBlockForm />}
                <WeekSchedule
                  referenceDate={currentDate}
                  blocks={allBlocks}
                  onDayClick={(date) => { setCurrentDate(date); setCalendarView("day") }}
                  onToggleComplete={handleToggleComplete}
                  onDeleteBlock={handleDeleteBlock}
                  onAddBlock={(date) => openAddBlock(date)}
                />
              </CardContent>
            </Card>
          )}

          {/* ── VISTA MES ── */}
          {calendarView === "month" && (
            <Card>
              <CardHeader>
                <CardTitle className="capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: es })}
                </CardTitle>
                <CardDescription>Haz clic en un día para ver su horario detallado</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthSchedule
                  month={currentDate}
                  blocks={allBlocks}
                  onDayClick={(date) => { setCurrentDate(date); setCalendarView("day") }}
                />
              </CardContent>
            </Card>
          )}

        </div>
      </div>
    </AppLayout>
  )
}
