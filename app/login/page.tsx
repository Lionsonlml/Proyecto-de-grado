"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Loader2 } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { saveAuthToken } from "@/lib/capacitor-auth"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  google_denied: "Cancelaste el inicio de sesión con Google.",
  google_error: "Error al autenticar con Google. Intenta de nuevo.",
  invalid_state: "Sesión expirada. Intenta de nuevo.",
  google_not_configured: "Google OAuth no está configurado correctamente.",
  google_no_email: "No se pudo obtener el email de tu cuenta de Google.",
}

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingPhase, setLoadingPhase] = useState("")
  const [errorMsg, setErrorMsg] = useState("")
  const router = useRouter()
  const { toast } = useToast()

  // Leer errores de Google OAuth que vienen como query params del callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const err = params.get("error")
    if (err && GOOGLE_ERROR_MESSAGES[err]) {
      setErrorMsg(GOOGLE_ERROR_MESSAGES[err])
      // Limpiar el query param sin recargar
      window.history.replaceState({}, "", "/login")
    }
  }, [])

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

      if (data.requiresTwoFactor) {
        router.push(`/2fa?tempToken=${data.tempToken}`)
        return
      }

      if (data.token) await saveAuthToken(data.token)
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
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

          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">O</span>
              </div>
            </div>

            {GOOGLE_CLIENT_ID && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={loading}
                onClick={() => { window.location.href = "/api/auth/google/start" }}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continuar con Google
              </Button>
            )}

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
