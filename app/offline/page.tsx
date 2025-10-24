"use client"

import { WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-6">
            <WifiOff className="h-12 w-12 text-muted-foreground" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Sin conexión</h1>
          <p className="text-muted-foreground text-balance">
            No hay conexión a internet. Algunas funciones pueden no estar disponibles.
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/">Volver al inicio</Link>
          </Button>

          <Button variant="outline" className="w-full bg-transparent" onClick={() => window.location.reload()}>
            Reintentar conexión
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Tus datos se sincronizarán automáticamente cuando vuelvas a estar en línea.
        </p>
      </div>
    </div>
  )
}
