/**
 * Helper para persistir el token JWT en @capacitor/preferences (iOS/Android).
 * En web usa cookies httpOnly normales — estas funciones son no-ops en web.
 */

function isCapacitorNative(): boolean {
  return typeof window !== "undefined" && !!(window as any).Capacitor?.isNative
}

export async function saveAuthToken(token: string): Promise<void> {
  if (!isCapacitorNative()) return
  const { Preferences } = await import("@capacitor/preferences")
  await Preferences.set({ key: "auth-token", value: token })
}

export async function getStoredAuthToken(): Promise<string | null> {
  if (!isCapacitorNative()) return null
  const { Preferences } = await import("@capacitor/preferences")
  const { value } = await Preferences.get({ key: "auth-token" })
  return value
}

export async function clearAuthToken(): Promise<void> {
  if (!isCapacitorNative()) return
  const { Preferences } = await import("@capacitor/preferences")
  await Preferences.remove({ key: "auth-token" })
}
