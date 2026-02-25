"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts"
import { TrendingUp, Activity, Clock, Zap } from "lucide-react"

export function ProductivityCharts() {
  const [tasks, setTasks] = useState<any[]>([])
  const [moods, setMoods] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [tasksRes, moodsRes] = await Promise.all([
        fetch("/api/tasks"),
        fetch("/api/moods"),
      ])

      if (tasksRes.ok) {
        const data = await tasksRes.json()
        setTasks(data.tasks || [])
      }

      if (moodsRes.ok) {
        const data = await moodsRes.json()
        setMoods(data.moods || [])
      }
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  // Gráfica de tareas por hora
  const tasksByHour = tasks.reduce((acc: any, task: any) => {
    const hour = task.hour || 9
    acc[hour] = (acc[hour] || 0) + 1
    return acc
  }, {})

  const hourlyData = Object.entries(tasksByHour)
    .map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      tareas: count,
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // Gráfica de energía por hora
  const energyByHour = moods.reduce((acc: any, mood: any) => {
    const hour = mood.hour || 12
    if (!acc[hour]) acc[hour] = { total: 0, count: 0 }
    acc[hour].total += mood.energy
    acc[hour].count += 1
    return acc
  }, {})

  const energyData = Object.entries(energyByHour)
    .map(([hour, data]: [string, any]) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      energía: Math.round(data.total / data.count),
    }))
    .sort((a, b) => a.hour.localeCompare(b.hour))

  // Gráfica de tareas completadas vs pendientes
  const completedCount = tasks.filter((t: any) => t.completed).length
  const pendingCount = tasks.filter((t: any) => !t.completed).length

  const statusData = [
    { name: "Completadas", value: completedCount, color: "#10b981" },
    { name: "Pendientes", value: pendingCount, color: "#f59e0b" },
  ]

  if (loading) {
    return <div className="text-center py-8">Cargando gráficas...</div>
  }

  return (
    <div className="grid gap-4 md:gap-6 md:grid-cols-2">
      {/* Tareas por Hora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-blue-600" />
            Tareas por Hora
          </CardTitle>
          <CardDescription>Distribución de tus tareas durante el día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="tareas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Energía por Hora */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-yellow-600" />
            Energía por Hora
          </CardTitle>
          <CardDescription>Tu nivel de energía durante el día</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={energyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" />
              <YAxis domain={[0, 10]} className="text-xs" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line type="monotone" dataKey="energía" stroke="#eab308" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Estado de Tareas 
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-green-600" />
            Estado de Tareas
          </CardTitle>
          <CardDescription>Progreso general</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      */}

      {/* Resumen Numérico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            Resumen de Productividad
          </CardTitle>
          <CardDescription>Estadísticas clave</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <div className="text-3xl font-bold text-primary">{tasks.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Tareas</div>
            </div>
            <div className="text-center p-4 bg-green-500/10 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{Math.round((completedCount / tasks.length) * 100) || 0}%</div>
              <div className="text-xs text-muted-foreground mt-1">Completadas</div>
            </div>
            <div className="text-center p-4 bg-yellow-500/10 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">{moods.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Registros Mood</div>
            </div>
            <div className="text-center p-4 bg-blue-500/10 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {moods.length > 0 ? Math.round(moods.reduce((s: number, m: any) => s + m.energy, 0) / moods.length) : 0}/10
              </div>
              <div className="text-xs text-muted-foreground mt-1">Energía Prom.</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

