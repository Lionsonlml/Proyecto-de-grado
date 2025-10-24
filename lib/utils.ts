import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Función para obtener la fecha y hora actual en la zona horaria local
export function getCurrentDateTime() {
  const now = new Date()
  return {
    date: now.toISOString().split('T')[0], // YYYY-MM-DD
    time: now.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }), // HH:MM
    hour: now.getHours(),
    timestamp: now.toISOString()
  }
}

// Función para formatear fechas en español
export function formatDateSpanish(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}
