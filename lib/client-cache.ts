/**
 * lib/client-cache.ts — Caché de fetch lado cliente
 *
 * Módulo singleton en el navegador: persiste mientras el usuario navega
 * entre páginas (router push/replace). Se limpia solo con recarga completa.
 * Evita re-fetch duplicado al cambiar de pestaña.
 */

interface CacheEntry {
  data: unknown
  timestamp: number
}

// Mapa singleton: persiste durante la sesión del navegador
const store = new Map<string, CacheEntry>()

const DEFAULT_TTL_MS = 180_000 // 3 minutos

/**
 * Wrapper de fetch con caché por URL.
 * Si el mismo URL fue fetched hace menos de `ttlMs` ms, retorna el valor cacheado.
 */
export async function fetchWithCache<T = unknown>(
  url: string,
  options?: RequestInit,
  ttlMs = DEFAULT_TTL_MS
): Promise<T> {
  // Solo cachear GETs sin body
  const cacheable = !options || options.method === undefined || options.method === "GET"

  if (cacheable) {
    const hit = store.get(url)
    if (hit && Date.now() - hit.timestamp < ttlMs) {
      return hit.data as T
    }
  }

  const res = await fetch(url, options)
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`)
  }

  const data = (await res.json()) as T

  if (cacheable) {
    store.set(url, { data, timestamp: Date.now() })
  }

  return data
}

/**
 * Invalida una entrada de caché (usar tras crear/actualizar/eliminar datos).
 * Acepta prefijos para invalidar grupos: invalidateCache("/api/tasks") invalida
 * cualquier entrada cuya clave comience con ese string.
 */
export function invalidateCache(urlOrPrefix: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(urlOrPrefix)) {
      store.delete(key)
    }
  }
}

/**
 * Limpia toda la caché (usar en logout).
 */
export function clearAllCache(): void {
  store.clear()
}

// ─── Caché de usuario (singleton extra-fino) ─────────────────────────────────
// Evita que 2 instancias de UserMenu hagan 2 llamadas a /api/auth/me

let userPromise: Promise<unknown> | null = null

export async function getCachedUser(): Promise<{ user: { id: number; email: string; name: string } } | null> {
  if (!userPromise) {
    userPromise = fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  }
  return userPromise as Promise<any>
}

export function invalidateUserCache(): void {
  userPromise = null
}
