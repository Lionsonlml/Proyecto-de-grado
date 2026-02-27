"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg("")
    setLoadingPhase("Conectando con la base de datos...")

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        const msg = response.status === 401
          ? "Email o contraseña incorrectos"
          : data.error || "Error al iniciar sesión"
        setErrorMsg(msg)
        return
      }

      setLoadingPhase("Preparando tu dashboard...")
      toast({ title: "¡Bienvenido!", description: `Hola ${data.user.name}` })
      router.push("/dashboard")
      router.refresh()
    } catch (error) {
      setErrorMsg("Error de conexión. Verifica tu internet e intenta de nuevo.")
    } finally {
      setLoading(false)
      setLoadingPhase("")
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">Timewize</span>
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Iniciar Sesión</CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para acceder a tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {errorMsg && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {loadingPhase || "Iniciando sesión..."}
                </>
              ) : (
                "Iniciar Sesión"
              )}
            </Button>

            {loading && (
              <p className="text-xs text-center text-muted-foreground">
                La primera conexión puede tardar unos segundos
              </p>
            )}
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O</span>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/register">Crear una cuenta nueva</Link>
            </Button>
          </div>

          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-2">
            <p className="text-sm font-medium text-center">Usuarios de prueba:</p>
            <div className="text-xs space-y-1 text-muted-foreground">
              <p><strong className="text-foreground">María</strong> (productiva mañana) · maria@test.com</p>
              <p><strong className="text-foreground">Juan</strong> (productivo tarde) · juan@test.com</p>
              <p><strong className="text-foreground">Carlos</strong> (perfil estresado) · carlos@test.com</p>
              <p><strong className="text-foreground">Laura</strong> (procrastinadora) · laura@test.com</p>
              <p className="pt-1 border-t border-border"><strong className="text-foreground">Admin</strong> · admin@test.com / admin123</p>
              <p className="text-center pt-1 opacity-70">Todos usan contraseña: <strong>password123</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
