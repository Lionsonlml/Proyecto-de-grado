"use client"

import { useEffect } from "react"

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/service-worker.js")
          .then((registration) => {
            console.log("✅ Service Worker registrado:", registration.scope)

            // Verificar actualizaciones cada hora
            setInterval(
              () => {
                registration.update()
              },
              60 * 60 * 1000,
            )

            // Escuchar actualizaciones del Service Worker
            registration.addEventListener("updatefound", () => {
              const newWorker = registration.installing
              if (newWorker) {
                newWorker.addEventListener("statechange", () => {
                  if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                    // Hay una nueva versión disponible
                    if (confirm("Nueva versión disponible. ¿Actualizar ahora?")) {
                      newWorker.postMessage({ type: "SKIP_WAITING" })
                      window.location.reload()
                    }
                  }
                })
              }
            })
          })
          .catch((error) => {
            console.error("❌ Error al registrar Service Worker:", error)
          })

        // Recargar cuando el Service Worker tome control
        let refreshing = false
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!refreshing) {
            refreshing = true
            window.location.reload()
          }
        })
      })
    }

    // Detectar si la app está instalada
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault()
      // Guardar el evento para mostrarlo más tarde
      ;(window as any).deferredPrompt = e
      console.log("💡 App lista para instalar")
    })

    // Detectar cuando la app se instala
    window.addEventListener("appinstalled", () => {
      console.log("✅ App instalada exitosamente")
      ;(window as any).deferredPrompt = null
    })
  }, [])

  return null
}
