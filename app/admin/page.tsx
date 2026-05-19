"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  ShieldCheck,
  Users,
  CheckSquare,
  Smile,
  Brain,
  Wrench,
  BarChart2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Database,
  Zap,
  AlertTriangle,
  LogOut,
} from "lucide-react"
import { getCachedUser, clearAllCache, invalidateUserCache } from "@/lib/client-cache"

interface AdminStats {
  users: {
    total: number
    activeLastWeek: number
    byRole: Array<{ role: string; count: number }>
  }
  tasks: {
    total: number
    completed: number
    pending: number
    inProgress: number
    cancelled: number
    completionRate: number
    avgDurationMin: number
    byCategory: Array<{ category: string; count: number }>
  }
  moods: {
    total: number
    avgEnergy: number
    avgFocus: number
    avgStress: number
  }
  ai: {
    totalInsights: number
    byType: Array<{ type: string; count: number }>
    cache: { totalEntries: number; activeEntries: number }
    fallbacks: Array<{ endpoint: string; count: number; totalAttempts: number }>
  }
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color = "text-primary",
}: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  color?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-2xl font-bold leading-none">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${color}`} />
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="w-full bg-muted rounded-full h-1.5">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [usageData, setUsageData] = useState<any>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    getCachedUser().then((data) => {
      if (!data?.user || data.user.role !== "admin") {
        router.replace("/dashboard")
        return
      }
      setAdminName(data.user.name)
      setAuthChecked(true)
    })
  }, [router])

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const res = await fetch("/api/admin/stats")
      if (!res.ok) { router.replace("/dashboard"); return }
      const data = await res.json()
      setStats(data)
    } catch {
      // ignorar
    } finally {
      setStatsLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (authChecked) loadStats()
  }, [authChecked, loadStats])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      clearAllCache()
      invalidateUserCache()
      router.push("/login")
    } catch {
      setLoggingOut(false)
    }
  }

  const handleTestGemini = async () => {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/gemini/test")
      setTestResult(await res.json())
    } catch {
      setTestResult({ status: "error", stage: "network", message: "Error de red al conectar con el servidor" })
    } finally {
      setTestLoading(false)
    }
  }

  const handleLoadUsage = async () => {
    setUsageLoading(true)
    try {
      const res = await fetch("/api/gemini/usage")
      setUsageData(await res.json())
    } catch {
      setUsageData({ error: "No se pudo cargar el uso" })
    } finally {
      setUsageLoading(false)
    }
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header standalone (sin AppNav) ──────────────────────── */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 max-w-5xl h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            <span className="font-semibold text-sm md:text-base">Panel Admin</span>
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
              {adminName}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            {loggingOut ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LogOut className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{loggingOut ? "Saliendo..." : "Cerrar sesión"}</span>
          </Button>
        </div>
      </header>

      {/* ── Contenido ──────────────────────────────────────────── */}
      <main className="container mx-auto px-4 max-w-5xl py-6 space-y-6">

        {/* Título + refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Estadísticas del sistema</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Sin datos de usuarios — solo métricas agregadas</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadStats} disabled={statsLoading} className="gap-2 shrink-0">
            <RefreshCw className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : stats ? (
          <>
            {/* ── Usuarios ─────────────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Users className="h-4 w-4" /> Usuarios
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Total registrados" value={stats.users.total} icon={Users} color="text-blue-500" />
                <StatCard
                  title="Activos (7 días)"
                  value={stats.users.activeLastWeek}
                  subtitle={`${stats.users.total > 0 ? Math.round((stats.users.activeLastWeek / stats.users.total) * 100) : 0}% del total`}
                  icon={TrendingUp}
                  color="text-green-500"
                />
                {stats.users.byRole.map((r) => (
                  <Card key={r.role as string}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground capitalize">{r.role as string}</p>
                        <p className="text-2xl font-bold">{r.count as number}</p>
                      </div>
                      <Badge variant={r.role === "admin" ? "default" : "secondary"} className="capitalize shrink-0">
                        {r.role as string}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* ── Tareas ───────────────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <CheckSquare className="h-4 w-4" /> Tareas
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Total" value={stats.tasks.total} icon={CheckSquare} color="text-violet-500" />
                <StatCard
                  title="Completadas"
                  value={`${stats.tasks.completionRate}%`}
                  subtitle={`${stats.tasks.completed} tareas`}
                  icon={TrendingUp}
                  color="text-green-500"
                />
                <StatCard title="Pendientes" value={stats.tasks.pending} icon={AlertTriangle} color="text-yellow-500" />
                <StatCard title="Duración prom." value={`${stats.tasks.avgDurationMin} min`} icon={Zap} color="text-orange-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Por estado</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-2.5">
                    {[
                      { label: "Completadas", value: stats.tasks.completed, color: "bg-green-500" },
                      { label: "Pendientes", value: stats.tasks.pending, color: "bg-yellow-500" },
                      { label: "En progreso", value: stats.tasks.inProgress, color: "bg-blue-500" },
                      { label: "Canceladas", value: stats.tasks.cancelled, color: "bg-red-400" },
                    ].map((item) => (
                      <div key={item.label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium">{item.value}</span>
                        </div>
                        <ProgressBar value={item.value} max={stats.tasks.total} color={item.color} />
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {stats.tasks.byCategory.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">Por categoría</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="grid grid-cols-2 gap-2">
                        {stats.tasks.byCategory.map((c) => (
                          <div key={c.category as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                            <span className="capitalize text-muted-foreground truncate">{c.category as string}</span>
                            <span className="font-bold ml-2 shrink-0">{c.count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>

            {/* ── Estado de Ánimo ──────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Smile className="h-4 w-4" /> Estado de Ánimo Global
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Registros totales" value={stats.moods.total} icon={Smile} color="text-pink-500" />
                <StatCard title="Energía prom." value={`${stats.moods.avgEnergy}/5`} icon={Zap} color="text-yellow-500" />
                <StatCard title="Concentración prom." value={`${stats.moods.avgFocus}/5`} icon={Brain} color="text-blue-500" />
                <StatCard title="Estrés prom." value={`${stats.moods.avgStress}/5`} icon={AlertTriangle} color="text-orange-500" />
              </div>
            </section>

            {/* ── IA ──────────────────────────────────────────── */}
            <section className="space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                <Brain className="h-4 w-4" /> Motor de IA
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard title="Análisis totales" value={stats.ai.totalInsights} icon={Brain} color="text-violet-500" />
                <StatCard
                  title="Caché IA"
                  value={stats.ai.cache.totalEntries}
                  subtitle={`${stats.ai.cache.activeEntries} activas`}
                  icon={Database}
                  color="text-cyan-500"
                />
                <StatCard
                  title="Fallbacks"
                  value={stats.ai.fallbacks.reduce((a, f) => a + (f.count as number), 0)}
                  icon={AlertTriangle}
                  color="text-orange-500"
                />
                <StatCard title="Tipos de análisis" value={stats.ai.byType.length} icon={Zap} color="text-green-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {stats.ai.byType.length > 0 && (
                  <Card>
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium">Llamadas por tipo</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-1.5">
                        {stats.ai.byType.map((t) => (
                          <div key={t.type as string} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{t.type as string}</span>
                            <span className="font-bold">{t.count as number}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {stats.ai.fallbacks.length > 0 && (
                  <Card className="border-orange-200 dark:border-orange-900">
                    <CardHeader className="p-4 pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Fallbacks por endpoint
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-1.5">
                      {stats.ai.fallbacks.map((f) => (
                        <div key={f.endpoint as string} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground font-mono truncate">{f.endpoint as string}</span>
                          <span className="font-bold ml-2 shrink-0">{f.count as number}×</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* ── Diagnóstico Gemini ────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <Wrench className="h-4 w-4" /> Diagnóstico de API Gemini
          </h2>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                Verifica que la <code className="font-mono bg-muted px-1 rounded">GEMINI_API_KEY</code> esté configurada y respondiendo correctamente
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Button onClick={handleTestGemini} disabled={testLoading} variant="outline" className="w-full">
                {testLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  "Probar conexión con Gemini"
                )}
              </Button>

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-sm space-y-2 ${
                    testResult.status === "ok"
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  }`}
                >
                  <div className="flex items-center gap-2 font-medium">
                    {testResult.status === "ok" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                  {testResult.status === "ok" && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="font-medium">Modelo:</span> {testResult.model}</div>
                      <div><span className="font-medium">Latencia:</span> {testResult.latencyMs}ms</div>
                      <div><span className="font-medium">Key:</span> {testResult.keyPreview}</div>
                      <div><span className="font-medium">Respuesta:</span> {testResult.responseText}</div>
                    </div>
                  )}
                  {testResult.hint && <p className="text-xs opacity-80">💡 {testResult.hint}</p>}
                  {testResult.rawError && (
                    <pre className="text-xs bg-black/10 rounded p-2 overflow-x-auto">{testResult.rawError}</pre>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* ── Cuota Gemini ─────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
            <BarChart2 className="h-4 w-4" /> Cuota de Gemini API
          </h2>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">
                Estimación de llamadas realizadas hoy vs límites del plan gratuito · gemini-2.5-flash-lite · 15 RPM · 1.000 RPD
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <Button onClick={handleLoadUsage} disabled={usageLoading} variant="outline" className="w-full gap-2">
                {usageLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Ver uso actual
                  </>
                )}
              </Button>

              {usageData && !usageData.error && (
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Solicitudes hoy</span>
                      <span className="font-medium">
                        {usageData.today.calls} / {usageData.today.limit.toLocaleString()} ({usageData.today.percentUsed}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          usageData.today.percentUsed >= 90
                            ? "bg-red-500"
                            : usageData.today.percentUsed >= 70
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{ width: `${usageData.today.percentUsed}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Restantes hoy", value: usageData.today.remaining.toLocaleString() },
                      { label: "Este mes", value: usageData.month.calls },
                      { label: "Límite / min", value: `${usageData.limits.rpm} rpm` },
                      { label: "Límite / día", value: usageData.limits.rpd.toLocaleString() },
                    ].map((item) => (
                      <div key={item.label} className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground">{item.label}</p>
                        <p className="font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {usageData.lastCall && (
                    <p className="text-xs text-muted-foreground">
                      Última llamada: <span className="font-medium">{usageData.lastCall.type}</span> —{" "}
                      {new Date(usageData.lastCall.at).toLocaleString("es-ES")}
                    </p>
                  )}

                  {usageData.today.percentUsed >= 80 && (
                    <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 text-xs text-yellow-800 dark:text-yellow-300">
                      Cuota al {usageData.today.percentUsed}% — Los análisis pueden usar el modo fallback pronto.
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground opacity-70">{usageData.note}</p>
                </div>
              )}

              {usageData?.error && (
                <p className="text-xs text-destructive">{usageData.error}</p>
              )}
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  )
}
