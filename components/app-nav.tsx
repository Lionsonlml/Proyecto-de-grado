"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, CheckSquare, Calendar, Smile, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { UserMenu } from "@/components/user-menu"

const navItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    icon: Home,
  },
  {
    href: "/tasks",
    label: "Tareas",
    icon: CheckSquare,
  },
  {
    href: "/schedule",
    label: "Horarios",
    icon: Calendar,
  },
  {
    href: "/moods",
    label: "Moods",
    icon: Smile,
  },
  {
    href: "/gemini-lab",
    label: "Timewize AI",
    icon: Sparkles,
  },
]

export function AppNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Top bar para móvil con menú de usuario */}
      <div className="fixed top-0 left-0 right-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <div className="container flex h-full items-center justify-between px-4">
          <h1 className="text-lg font-semibold">Timewize</h1>
          <UserMenu />
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:top-0 md:bottom-auto md:border-b md:border-t-0">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center justify-around md:justify-start md:gap-6 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-1 px-3 py-2 text-xs font-medium transition-colors hover:text-primary md:flex-row md:gap-2 md:text-sm",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              )
            })}
          </div>
          
          <div className="hidden md:flex items-center gap-2">
            <UserMenu />
          </div>
        </div>
      </nav>
    </>
  )
}
