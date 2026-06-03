import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { COLOMBIA_TZ, nowColombia, parseDbTimestamp } from '@/lib/timezone'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fecha y hora actual coherentes con la hora local de Colombia (UTC-5).
// (En Vercel el servidor corre en UTC; por eso delegamos a nowColombia.)
export function getCurrentDateTime() {
  return nowColombia()
}

// Función para formatear fechas en español (hora de Colombia)
export function formatDateSpanish(dateString: string) {
  return parseDbTimestamp(dateString).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: COLOMBIA_TZ,
  })
}
