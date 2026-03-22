"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, LogOut, Moon, Sun, Mail, Loader2 } from "lucide-react"
import { useTheme } from "next-themes"
import { getCachedUser, clearAllCache, invalidateUserCache } from "@/lib/client-cache"
import { useToast } from "@/hooks/use-toast"

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? ""

export function UserMenu() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [user, setUser] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const [linkingGoogle, setLinkingGoogle] = useState(false)
  const linkCallbackRef = useRef<((resp: { credential: string }) => void) | null>(null)
  // Div oculto donde GIS renderiza su botón real para click programático
  const googleBtnRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCachedUser().then((data) => {
      if (data?.user) setUser(data.user)
    })
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      clearAllCache()
      invalidateUserCache()
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      setLoggingOut(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  async function handleLinkCredential(response: { credential: string }) {
    setLinkingGoogle(true)
    try {
      const res = await fetch("/api/auth/google/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: response.credential }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: "Error", description: data.error ?? "No se pudo vincular la cuenta", variant: "destructive" })
        return
      }

      toast({
        title: data.alreadyLinked ? "Ya vinculada" : "Cuenta vinculada",
        description: data.message,
      })
    } catch {
      toast({ title: "Error de conexión", description: "Verifica tu internet e intenta de nuevo", variant: "destructive" })
    } finally {
      setLinkingGoogle(false)
    }
  }

  // Inicializar GIS y renderizar botón en div oculto al montar el componente
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
    linkCallbackRef.current = handleLinkCredential

    const origErr = console.error
    console.error = (...args: any[]) => {
      if (typeof args[0] === "string" && args[0].includes("GSI_LOGGER")) return
      origErr.apply(console, args)
    }

    const initGIS = () => {
      const g = (window as any).google
      if (!g || !googleBtnRef.current) return
      g.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => linkCallbackRef.current?.(resp),
        error_callback: (err: { type: string }) => {
          if (err.type === "invalid_client") {
            toast({
              title: "Origen no autorizado aún",
              description: "Espera unos minutos y vuelve a intentarlo.",
              variant: "destructive",
            })
            setLinkingGoogle(false)
          }
        },
      })
      g.accounts.id.renderButton(googleBtnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        width: 300,
      })
    }

    if ((window as any).google?.accounts) {
      initGIS()
    } else {
      const existing = document.getElementById("gsi-script")
      if (existing) {
        existing.addEventListener("load", initGIS, { once: true })
      } else {
        const script = document.createElement("script")
        script.id = "gsi-script"
        script.src = "https://accounts.google.com/gsi/client"
        script.async = true
        script.defer = true
        script.onload = initGIS
        document.head.appendChild(script)
      }
    }

    return () => { console.error = origErr }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleLinkGoogle() {
    if (!GOOGLE_CLIENT_ID) {
      toast({ title: "No configurado", description: "Google Sign-In no está disponible en esta instancia", variant: "destructive" })
      return
    }
    // Click programático en el botón renderizado por GIS (más confiable que prompt())
    const gBtn = googleBtnRef.current?.querySelector<HTMLElement>('[role="button"]')
    if (gBtn) {
      gBtn.click()
    } else {
      // Fallback si GIS aún no inicializó
      toast({ title: "Cargando...", description: "Google aún está cargando, intenta en un momento." })
    }
  }

  return (
    <>
    {/* Div oculto fuera del viewport donde GIS renderiza su botón real */}
    {GOOGLE_CLIENT_ID && (
      <div
        ref={googleBtnRef}
        style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0 }}
        aria-hidden="true"
      />
    )}
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || "Usuario"}</p>
            <p className="text-xs leading-none text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {user?.email || "Cargando..."}
            </p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {GOOGLE_CLIENT_ID && (
          <DropdownMenuItem
            onClick={handleLinkGoogle}
            disabled={linkingGoogle}
            className="cursor-pointer"
          >
            {linkingGoogle ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            <span>{linkingGoogle ? "Vinculando..." : "Vincular con Google"}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
          {theme === "dark" ? (
            <>
              <Sun className="mr-2 h-4 w-4" />
              <span>Modo Claro</span>
            </>
          ) : (
            <>
              <Moon className="mr-2 h-4 w-4" />
              <span>Modo Oscuro</span>
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} disabled={loggingOut} className="cursor-pointer text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>{loggingOut ? "Cerrando sesión..." : "Cerrar Sesión"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </>
  )
}

