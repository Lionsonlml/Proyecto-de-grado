"use client"

import { useState, useEffect } from "react"
import { X, Info, AlertTriangle, Wifi, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

type BannerVariant = "info" | "warning" | "fallback" | "quota" | "onboarding"

interface AiInfoBannerProps {
  variant: BannerVariant
  title?: string
  message: string
  dismissId?: string   // si se pasa, se guarda en localStorage al cerrar
  className?: string
  compact?: boolean    // versión mini inline
}

const VARIANTS = {
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900",
    text: "text-blue-800 dark:text-blue-300",
    icon: Info,
    iconColor: "text-blue-500",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900",
    text: "text-yellow-800 dark:text-yellow-300",
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
  },
  fallback: {
    bg: "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900",
    text: "text-orange-800 dark:text-orange-300",
    icon: Wifi,
    iconColor: "text-orange-500",
  },
  quota: {
    bg: "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900",
    text: "text-red-800 dark:text-red-300",
    icon: AlertTriangle,
    iconColor: "text-red-500",
  },
  onboarding: {
    bg: "bg-primary/5 border-primary/20",
    text: "text-foreground",
    icon: Sparkles,
    iconColor: "text-primary",
  },
} as const

export function AiInfoBanner({
  variant,
  title,
  message,
  dismissId,
  className,
  compact = false,
}: AiInfoBannerProps) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (dismissId) {
      const dismissed = localStorage.getItem(`banner:${dismissId}`)
      if (dismissed === "1") setVisible(false)
    }
  }, [dismissId])

  if (!visible) return null

  const dismiss = () => {
    setVisible(false)
    if (dismissId) localStorage.setItem(`banner:${dismissId}`, "1")
  }

  const { bg, text, icon: Icon, iconColor } = VARIANTS[variant]

  if (compact) {
    return (
      <div className={cn("flex items-start gap-2 p-2.5 rounded-lg border text-xs", bg, text, className)}>
        <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", iconColor)} />
        <p className="leading-relaxed">{message}</p>
        {dismissId && (
          <button onClick={dismiss} className="ml-auto shrink-0 opacity-60 hover:opacity-100">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border text-sm", bg, text, className)}>
      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", iconColor)} />
      <div className="flex-1 space-y-0.5 min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <p className="text-xs leading-relaxed opacity-90">{message}</p>
      </div>
      {dismissId && (
        <button onClick={dismiss} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
