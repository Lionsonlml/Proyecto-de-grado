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
  KeyRound,
  Gauge,
  Clock,
  Coins,
} from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { getCachedUser, clearAllCache, invalidateUserCache } from "@/lib/client-cache"
import { formatBogotaDateTime } from "@/lib/timezone"
import { AdminImpact } from "@/components/admin-impact"

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

function fmtNum(n: number | null | undefined): string {
  return Number(n ?? 0).toLocaleString("es-CO")
}

function fmtUsd(n: number | null | undefined): string {
  const v = Number(n ?? 0)
  if (v === 0) return "$0.00"
  if (v < 0.01) return "$" + v.toFixed(4)
  return "$" + v.toFixed(2)
}

function fmtDuration(ms: number | null | undefined): string {
  const totalMin = Math.max(0, Math.floor((ms ?? 0) / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AdminPage() {
  const router = useRouter()
  const [adminName, setAdminName] = useState("")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [testLoading, setTestLoading] = useState(false)
  const [testResult, setTestResult] = useState<any>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageData, setUsageData] = useState<any>(null)
  const [tierSaving, setTierSaving] = useState(false)
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

  const loadUsage = useCallback(async () => {
    setUsageLoading(true)
    try {
      const res = await fetch("/api/gemini/usage")
      setUsageData(await res.json())
    } catch {
      setUsageData({ error: "No se pudo cargar el uso" })
    } finally {
      setUsageLoading(false)
    }
  }, [])

  const handleSetTier = async (tier: "free" | "paid") => {
    setTierSaving(true)
    try {
      await fetch("/api/gemini/usage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      })
      await loadUsage()
    } catch {
      // ignorar — el switch vuelve a su estado real al recargar
    } finally {
      setTierSaving(false)
    }
  }

  useEffect(() => {
    if (authChecked) {
      loadStats()
      loadUsage()
    }
  }, [authChecked, loadStats, loadUsage])

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
              <p className="text-xs text-muted-foreground">
                Solo se muestran conteos numéricos. Ningún dato personal, nombre ni contenido de usuarios es visible en este panel.
              </p>
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

                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Por categoría</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {stats.tasks.byCategory.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sin tareas registradas aún.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {stats.tasks.byCategory.map((c) => (
                          <div key={c.category as string} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                            <span className="capitalize text-muted-foreground truncate">{c.category as string || "Sin categoría"}</span>
                            <span className="font-bold ml-2 shrink-0">{c.count as number}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
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

              {/* Disclaimer IA */}
              <div className="p-3 rounded-lg bg-muted/50 border text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Sobre estas métricas</p>
                <p>
                  <span className="font-medium">Análisis totales:</span> peticiones reales enviadas a Gemini (excluye caché y fallbacks).
                </p>
                <p>
                  <span className="font-medium">Caché activa:</span> respuestas guardadas que aún no han expirado — evitan llamadas innecesarias a la API.
                </p>
                <p>
                  <span className="font-medium">Fallbacks:</span> veces que Gemini no respondió correctamente (cuota agotada, error de red, etc.) y se usó una respuesta predefinida.
                </p>
                <p>
                  <span className="font-medium">Tipos de análisis:</span> cada módulo de IA (patrones, recomendaciones, horario) tiene su propio contador de uso.
                </p>
              </div>

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
                  subtitle={stats.ai.fallbacks.reduce((a, f) => a + (f.count as number), 0) === 0 ? "Sin incidencias" : "Ver detalle abajo"}
                  icon={AlertTriangle}
                  color={stats.ai.fallbacks.reduce((a, f) => a + (f.count as number), 0) > 0 ? "text-orange-500" : "text-green-500"}
                />
                <StatCard title="Tipos de análisis" value={stats.ai.byType.length} icon={Zap} color="text-green-500" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Card>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium">Llamadas por tipo de análisis</CardTitle>
                    <p className="text-xs text-muted-foreground">Cuántas veces los usuarios han solicitado cada módulo de IA</p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {stats.ai.byType.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">Sin análisis registrados aún. Los datos aparecerán aquí cuando los usuarios usen el módulo de IA.</p>
                    ) : (
                      <div className="space-y-2">
                        {stats.ai.byType.map((t) => (
                          <div key={t.type as string} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{t.type as string}</span>
                              <span className="font-bold">{t.count as number}</span>
                            </div>
                            <ProgressBar
                              value={t.count as number}
                              max={stats.ai.totalInsights}
                              color="bg-violet-500"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className={stats.ai.fallbacks.length > 0 ? "border-orange-200 dark:border-orange-900" : ""}>
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className={`h-4 w-4 ${stats.ai.fallbacks.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
                      Fallbacks por módulo
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {stats.ai.fallbacks.length === 0
                        ? "Un fallback ocurre cuando Gemini no responde y se usa contenido predefinido en su lugar."
                        : "Módulos que han usado respuestas predefinidas por fallo de Gemini (cuota, red, timeout)."}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1.5">
                    {stats.ai.fallbacks.length === 0 ? (
                      <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 py-1">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Sin fallbacks registrados — Gemini responde correctamente.</span>
                      </div>
                    ) : (
                      stats.ai.fallbacks.map((f) => (
                        <div key={f.endpoint as string} className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{f.endpoint as string}</span>
                          <span className="font-bold ml-2 shrink-0 text-orange-600">{f.count as number}×</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        ) : null}

        {/* ── Impacto en usuarios (Productividad y Bienestar) ───── */}
        <AdminImpact />

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

        {/* ── Consumo y cuota Gemini ───────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
              <BarChart2 className="h-4 w-4" /> Consumo y cuota de Gemini API
            </h2>
            <Button variant="outline" size="sm" onClick={loadUsage} disabled={usageLoading} className="gap-2 shrink-0">
              <RefreshCw className={`h-4 w-4 ${usageLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              {usageLoading && !usageData ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : usageData?.error ? (
                <p className="text-xs text-destructive">{usageData.error}</p>
              ) : usageData ? (
                <>
                  {/* Encabezado: tier + toggle, modelo, key */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={usageData.tier === "paid" ? "default" : "secondary"}>
                          {usageData.tier === "paid" ? "Key de pago" : "Key gratuita"}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">{usageData.model}</span>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <KeyRound className="h-3 w-3 shrink-0" />
                        {usageData.keyConfigured ? (
                          <span className="font-mono">{usageData.keyPreview}</span>
                        ) : (
                          <span className="text-destructive">Sin GEMINI_API_KEY configurada</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs ${usageData.tier === "free" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        Gratuita
                      </span>
                      <Switch
                        checked={usageData.tier === "paid"}
                        disabled={tierSaving}
                        onCheckedChange={(v) => handleSetTier(v ? "paid" : "free")}
                        aria-label="Alternar tier de la key (gratuita / de pago)"
                      />
                      <span className={`text-xs ${usageData.tier === "paid" ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                        De pago
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Marca si la key activa es de pago o gratuita. Esto ajusta los límites del plan y el coste estimado que se muestran abajo.
                  </p>

                  {/* Cuota diaria (RPD) — solo el plan gratuito tiene tope diario */}
                  {usageData.limits.rpd != null ? (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Gauge className="h-3.5 w-3.5" /> Solicitudes hoy (cuota diaria)</span>
                        <span className="font-medium text-foreground">
                          {fmtNum(usageData.daily.requests)} / {fmtNum(usageData.limits.rpd)} ({usageData.daily.percentUsed}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            usageData.daily.percentUsed >= 90
                              ? "bg-red-500"
                              : usageData.daily.percentUsed >= 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{ width: `${usageData.daily.percentUsed}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Quedan <span className="font-semibold text-foreground">{fmtNum(usageData.daily.requestsRemaining)}</span> solicitudes antes de agotar la cuota (pasaría a modo fallback).
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                      Plan de pago: sin tope diario práctico de solicitudes. El control relevante es el coste estimado (abajo).
                    </div>
                  )}

                  {/* Refresco de la cuota */}
                  <div className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      La cuota diaria se refresca en{" "}
                      <span className="font-semibold text-foreground">{fmtDuration(usageData.reset.dailyInMs)}</span>{" "}
                      (≈ {formatBogotaDateTime(usageData.reset.dailyAtIso)}, hora Colombia · medianoche del Pacífico).
                    </span>
                  </div>

                  {/* Métricas rápidas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Tokens hoy", value: fmtNum(usageData.daily.totalTokens), icon: Zap },
                      { label: "Tokens este mes", value: fmtNum(usageData.month.totalTokens), icon: Database },
                      { label: "Solicitudes mes", value: fmtNum(usageData.month.requests), icon: TrendingUp },
                      { label: "Último minuto", value: `${fmtNum(usageData.minute.requests)}/${fmtNum(usageData.limits.rpm)} rpm`, icon: Gauge },
                    ].map((item) => (
                      <div key={item.label} className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground flex items-center gap-1">
                          <item.icon className="h-3 w-3 shrink-0" />
                          {item.label}
                        </p>
                        <p className="font-bold text-sm">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Coste estimado */}
                  <div className="p-3 rounded-lg border bg-muted/30 space-y-1">
                    <p className="text-xs font-semibold flex items-center gap-1.5">
                      <Coins className="h-3.5 w-3.5 text-amber-500" /> Coste estimado
                    </p>
                    {usageData.cost.isFree ? (
                      <p className="text-xs text-muted-foreground">
                        Plan gratuito: <span className="font-semibold text-green-600">$0.00</span> este mes. En un plan de pago equivaldría a ≈{" "}
                        <span className="font-semibold text-foreground">{fmtUsd(usageData.cost.monthUsd)}</span>{" "}
                        (proyección a fin de mes ≈ {fmtUsd(usageData.cost.projectedMonthUsd)}).
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Este mes ≈ <span className="font-semibold text-foreground">{fmtUsd(usageData.cost.monthUsd)}</span> · hoy ≈ {fmtUsd(usageData.cost.todayUsd)} · proyección a fin de mes ≈{" "}
                        <span className="font-semibold text-foreground">{fmtUsd(usageData.cost.projectedMonthUsd)}</span>.
                      </p>
                    )}
                    <p className="text-[11px] text-muted-foreground opacity-80">
                      Precio de referencia: entrada {fmtUsd(usageData.cost.perMillion.input)} · salida {fmtUsd(usageData.cost.perMillion.output)} por millón de tokens.
                    </p>
                  </div>

                  {/* Alerta de cuota */}
                  {usageData.limits.rpd != null && usageData.daily.percentUsed >= 80 && (
                    <div className="p-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 text-xs text-yellow-800 dark:text-yellow-300">
                      Cuota al {usageData.daily.percentUsed}% — al agotarse, los análisis usarán el modo fallback hasta el refresco.
                    </div>
                  )}

                  {usageData.lastCall && (
                    <p className="text-xs text-muted-foreground">
                      Última llamada real: {formatBogotaDateTime(usageData.lastCall.at)} · {fmtNum(usageData.lastCall.totalTokens)} tokens
                    </p>
                  )}

                  <p className="text-[11px] text-muted-foreground opacity-70">{usageData.note}</p>
                </>
              ) : null}
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  )
}
