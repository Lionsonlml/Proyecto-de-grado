"use client"

import { useState, useEffect } from "react"
import { fetchWithCache, invalidateCache } from "@/lib/client-cache"
import { StatsCard } from "@/components/stats-card"
import { QuickActions } from "@/components/quick-actions"
import { RecentTasks } from "@/components/recent-tasks"
import { MoodSummary } from "@/components/mood-summary"
import { ProductivityCharts } from "@/components/productivity-charts"
import { MotivationalQuotes } from "@/components/motivational-quotes"
import type { Task, Mood } from "@/lib/types"
import { CheckCircle2, ListTodo, Clock, Calendar } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [rawTasks, setRawTasks] = useState<any[]>([])
  const [rawMoods, setRawMoods] = useState<any[]>([])
  const [moods, setMoods] = useState<Mood[]>([])
  const [loading, setLoading] = useState(true)

  const convertMoodType = (type: string): Mood["mood"] => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes("excelente") || lowerType.includes("enfocado") || lowerType.includes("energético") || lowerType.includes("peak")) return "excelente"
    if (lowerType.includes("bien") || lowerType.includes("productivo") || lowerType.includes("motivado")) return "bien"
    if (lowerType.includes("mal") || lowerType.includes("cansado") || lowerType.includes("lento")) return "mal"
    if (lowerType.includes("muy")) return "muy-mal"
    return "neutral"
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        // Un solo round-trip a /api/user/data (tasks + moods en Promise.all interno)
        const userData = await fetchWithCache<{ tasks: any[]; moods: any[] }>("/api/user/data")

        setRawTasks(userData.tasks || [])
        const convertedTasks: Task[] = (userData.tasks || []).map((t: any) => ({
          id: String(t.id),
          title: t.title,
          description: t.description || undefined,
          category: (t.category || "personal") as Task["category"],
          priority: (t.priority || "media") as Task["priority"],
          status: (t.status || (t.completed ? "completada" : "pendiente")) as Task["status"],
          estimatedMinutes: t.duration || undefined,
          dueDate: t.due_date || t.date || undefined,
          createdAt: t.created_at || new Date().toISOString(),
          updatedAt: t.created_at || new Date().toISOString(),
        }))
        setTasks(convertedTasks)

        setRawMoods(userData.moods || [])
        const convertedMoods: Mood[] = (userData.moods || []).map((m: any) => ({
          id: String(m.id),
          mood: convertMoodType(m.type),
          energy: m.energy,
          focus: m.focus,
          stress: m.stress,
          notes: m.notes || undefined,
          timestamp: m.created_at || new Date().toISOString(),
        }))
        const sortedMoods = convertedMoods.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setMoods(sortedMoods)
      } catch (error) {
        console.error("Error cargando datos:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    const completed = status === "completada"

    // 1. Optimistic update inmediato — sin esperar al servidor
    setTasks(prev =>
      prev.map(t => (t.id === id ? { ...t, status, completed: undefined } : t))
    )
    setRawTasks(prev =>
      prev.map(t =>
        (String(t.id) === id || String(t.id) === id.replace(/^db-/, ""))
          ? { ...t, status, completed: completed ? 1 : 0 }
          : t
      )
    )

    // 2. Persistir en backend sin re-fetch
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id.replace(/^db-/, ""),
          status,
          completed: completed ? 1 : 0,
        }),
      })
      // Invalidar caché silenciosamente para que la próxima navegación traiga datos frescos
      invalidateCache("/api/user/data")
    } catch (error) {
      console.error("Error actualizando estado:", error)
      // Revertir optimistic update si falla
      const userData = await fetchWithCache<{ tasks: any[]; moods: any[] }>("/api/user/data")
      const convertedTasks: Task[] = (userData.tasks || []).map((t: any) => ({
        id: String(t.id),
        title: t.title,
        description: t.description || undefined,
        category: (t.category || "personal") as Task["category"],
        priority: (t.priority || "media") as Task["priority"],
        status: (t.status || (t.completed ? "completada" : "pendiente")) as Task["status"],
        estimatedMinutes: t.duration || undefined,
        dueDate: t.due_date || t.date || undefined,
        createdAt: t.created_at || new Date().toISOString(),
        updatedAt: t.created_at || new Date().toISOString(),
      }))
      setTasks(convertedTasks)
    }
  }

  const completedTasks = tasks.filter((t) => t.status === "completada").length
  const pendingTasks = tasks.filter((t) => t.status === "pendiente" || t.status === "en-progreso").length
  const totalTasks = tasks.length

  return (
    <AppLayout>
      <div className="container mx-auto px-4 pt-20 pb-20 md:pt-8 md:pb-8 max-w-7xl">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm md:text-base text-muted-foreground">Resumen de tu productividad</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-4 md:gap-4 mb-6 md:mb-8">
          <StatsCard
            title="Completadas"
            value={completedTasks}
            description={`${totalTasks} total`}
            icon={CheckCircle2}
          />
          <StatsCard 
            title="Pendientes" 
            value={pendingTasks} 
            description="Por hacer" 
            icon={ListTodo} 
          />
          <StatsCard
            title="Estados"
            value={moods.length}
            description="Registros"
            icon={Calendar}
          />
          <StatsCard
            title="Energía Prom."
            value={moods.length > 0 ? `${Math.round(moods.reduce((s, m) => s + m.energy, 0) / moods.length)}/5` : "N/A"}
            description="Últimos registros"
            icon={Clock}
          />
        </div>

        {/* Gráficas de Productividad — datos del fetch del dashboard (sin llamada extra) */}
        <div className="mb-6 md:mb-8">
          <ProductivityCharts tasks={rawTasks} moods={rawMoods} />
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <RecentTasks tasks={tasks} onStatusChange={handleStatusChange} />
          </div>

          <div className="space-y-4 md:space-y-6">
            <QuickActions />
            <MoodSummary moods={moods} />
          </div>
        </div>

        {/* Frases Motivacionales - Parte inferior */}
        <div className="mt-6 md:mt-8">
          <MotivationalQuotes moods={moods} />
        </div>
      </div>
    </AppLayout>
  )
}
