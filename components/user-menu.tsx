"use client"

import { useState, useEffect } from "react"
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
import { User, LogOut, Moon, Sun, Mail, CheckCircle2, Clock } from "lucide-react"
import { useTheme } from "next-themes"

export function UserMenu() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [user, setUser] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [userRes, tasksRes, moodsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/tasks"),
          fetch("/api/moods"),
        ])

        if (userRes.ok) {
          const userData = await userRes.json()
          setUser(userData.user)
        }

        if (tasksRes.ok && moodsRes.ok) {
          const tasksData = await tasksRes.json()
          const moodsData = await moodsRes.json()
          
          const tasks = tasksData.tasks || []
          const moods = moodsData.moods || []
          
          setStats({
            totalTasks: tasks.length,
            completedTasks: tasks.filter((t: any) => t.completed).length,
            totalMoods: moods.length,
            avgEnergy: moods.length > 0 
              ? Math.round(moods.reduce((sum: number, m: any) => sum + (m.energy || 0), 0) / moods.length)
              : 0,
          })
        }
      } catch (error) {
        console.error("Error cargando datos:", error)
      }
    }

    loadData()
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/login")
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
      setLoggingOut(false)
    }
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
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
        
        {stats && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <p className="text-xs font-medium text-muted-foreground mb-2">Resumen</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1 p-2 rounded-md bg-primary/5">
                  <CheckCircle2 className="h-3 w-3 text-primary" />
                  <div>
                    <div className="font-semibold">{stats.completedTasks}/{stats.totalTasks}</div>
                    <div className="text-[10px] text-muted-foreground">Tareas</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 p-2 rounded-md bg-primary/5">
                  <Clock className="h-3 w-3 text-primary" />
                  <div>
                    <div className="font-semibold">{stats.avgEnergy}/10</div>
                    <div className="text-[10px] text-muted-foreground">Energía</div>
                  </div>
                </div>
              </div>
            </div>
          </>
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
  )
}

