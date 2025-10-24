const CACHE_NAME = "timegemini-v1"
const RUNTIME_CACHE = "timegemini-runtime"

// Archivos esenciales para cachear durante la instalación
const PRECACHE_URLS = ["/", "/offline", "/manifest.json", "/icons/icon-192x192.jpg", "/icons/icon-512x512.jpg"]

// Instalación del Service Worker
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Instalando...")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Pre-cacheando archivos")
        return cache.addAll(PRECACHE_URLS)
      })
      .then(() => self.skipWaiting()),
  )
})

// Activación del Service Worker
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activando...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
            })
            .map((cacheName) => {
              console.log("[Service Worker] Eliminando caché antigua:", cacheName)
              return caches.delete(cacheName)
            }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// Estrategia de caché: Network First con fallback a Cache
self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Solo cachear peticiones GET del mismo origen
  if (request.method !== "GET" || !url.origin.includes(self.location.origin)) {
    return
  }

  // Estrategia Network First para API de Gemini
  if (url.pathname.includes("/api/gemini")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar la respuesta para guardarla en caché
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
          return response
        })
        .catch(() => {
          // Si falla la red, intentar desde caché
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || caches.match("/offline")
          })
        }),
    )
    return
  }

  // Estrategia Cache First para assets estáticos
  if (request.destination === "image" || request.destination === "font" || request.destination === "style") {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((response) => {
          return caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, response.clone())
            return response
          })
        })
      }),
    )
    return
  }

  // Estrategia Network First para todo lo demás
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(request).then((cachedResponse) => {
          return cachedResponse || caches.match("/offline")
        })
      }),
  )
})

// Manejo de mensajes desde el cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }

  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
      }),
    )
  }
})

// Sincronización en segundo plano para tareas pendientes
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-tasks") {
    event.waitUntil(syncPendingTasks())
  }
})

async function syncPendingTasks() {
  try {
    // Aquí se sincronizarían las tareas pendientes cuando haya conexión
    console.log("[Service Worker] Sincronizando tareas pendientes...")
    // Implementar lógica de sincronización
  } catch (error) {
    console.error("[Service Worker] Error en sincronización:", error)
  }
}

// Notificaciones push (opcional para futuras funcionalidades)
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "Nueva actualización disponible",
    icon: "/icons/icon-192x192.jpg",
    badge: "/icons/badge-72x72.png",
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Ver ahora",
        icon: "/icons/checkmark.png",
      },
      {
        action: "close",
        title: "Cerrar",
        icon: "/icons/close.png",
      },
    ],
  }

  event.waitUntil(self.registration.showNotification("TimeGemini", options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"))
  }
})
