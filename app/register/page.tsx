"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Brain, Loader2, Eye, EyeOff } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

function getPasswordStrength(pwd: string): { level: number; label: string; color: string } {
  if (!pwd) return { level: 0, label: "", color: "" }
  let score = 0
  if (pwd.length >= 6) score++
  if (pwd.length >= 10) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/\d/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++

  if (score <= 1) return { level: 1, label: "Débil", color: "bg-red-500" }
  if (score === 2) return { level: 2, label: "Regular", color: "bg-orange-500" }
  if (score === 3) return { level: 3, label: "Buena", color: "bg-yellow-500" }
  if (score === 4) return { level: 4, label: "Fuerte", color: "bg-green-500" }
  return { level: 5, label: "Muy fuerte", color: "bg-emerald-500" }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function RegisterPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirm: false })
  const router = useRouter()
  const { toast } = useToast()

  const strength = getPasswordStrength(password)
  const confirmError = touched.confirm && confirmPassword.length > 0 && password !== confirmPassword
  const emailError = touched.email && email.length > 0 && !EMAIL_REGEX.test(email)
  const nameError = touched.name && name.trim().length > 0 && name.trim().length < 2

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (name.trim().length < 2) {
      toast({ title: "Error", description: "El nombre debe tener al menos 2 caracteres", variant: "destructive" })
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      toast({ title: "Error", description: "El formato del email no es válido", variant: "destructive" })
      return
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres", variant: "destructive" })
      return
    }

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden", variant: "destructive" })
      return
    }

    setLoading(true)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast({ title: "Error", description: data.error || "Error al registrarse", variant: "destructive" })
        return
      }

      toast({ title: "¡Cuenta creada!", description: `Bienvenido ${data.user.name}` })
      router.push("/dashboard")
      router.refresh()
    } catch {
      toast({ title: "Error", description: "Error de conexión", variant: "destructive" })
    } finally {
      setLoading(false)
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
          <CardTitle className="text-2xl text-center">Crear Cuenta</CardTitle>
          <CardDescription className="text-center">
            Completa el formulario para crear tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                type="text"
                placeholder="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 50))}
                onBlur={() => setTouched(t => ({ ...t, name: true }))}
                required
                disabled={loading}
                maxLength={50}
                className={cn(nameError && "border-destructive")}
              />
              {nameError && (
                <p className="text-xs text-destructive">El nombre debe tener al menos 2 caracteres</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim().slice(0, 100))}
                onBlur={() => setTouched(t => ({ ...t, email: true }))}
                required
                disabled={loading}
                maxLength={100}
                className={cn(emailError && "border-destructive")}
              />
              {emailError && (
                <p className="text-xs text-destructive">Ingresa un email con formato válido (ej: usuario@dominio.com)</p>
              )}
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value.slice(0, 128))}
                  onBlur={() => setTouched(t => ({ ...t, password: true }))}
                  required
                  disabled={loading}
                  className="pr-10"
                  maxLength={128}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Barra de fortaleza */}
              {password.length > 0 && (
                <div className="space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          i <= strength.level ? strength.color : "bg-muted"
                        )}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{strength.label}</p>
                </div>
              )}
              {touched.password && password.length > 0 && password.length < 6 && (
                <p className="text-xs text-destructive">La contraseña debe tener al menos 6 caracteres</p>
              )}
            </div>

            {/* Confirmar Contraseña */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value.slice(0, 128))}
                  onBlur={() => setTouched(t => ({ ...t, confirm: true }))}
                  required
                  disabled={loading}
                  className={cn("pr-10", confirmError && "border-destructive")}
                  maxLength={128}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-0 top-0 h-full px-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showConfirmPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="text-xs text-destructive">Las contraseñas no coinciden</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || confirmError || emailError || nameError || password.length < 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando cuenta...
                </>
              ) : (
                "Crear Cuenta"
              )}
            </Button>
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
              <Link href="/login">Ya tengo una cuenta</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
