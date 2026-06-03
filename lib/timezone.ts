// Utilidades de zona horaria para Colombia (Cundinamarca).
// Colombia usa America/Bogota = UTC-5 fijo, sin horario de verano (DST),
// por lo que la aritmética con offset fijo es segura y exacta.

export const COLOMBIA_TZ = "America/Bogota"

// Offset fijo de Colombia respecto a UTC, en minutos (UTC-5).
const COLOMBIA_OFFSET_MINUTES = -5 * 60

/**
 * Convierte un timestamp de la base de datos en un instante absoluto (Date).
 *
 * - SQLite `CURRENT_TIMESTAMP` devuelve "YYYY-MM-DD HH:MM:SS" en UTC pero SIN
 *   indicador de zona. JavaScript interpretaría ese texto como hora LOCAL, lo
 *   que en Colombia produce un desfase de +5h. Aquí lo forzamos a UTC.
 * - Los strings ISO con "Z" u offset explícito (p. ej. `toISOString()`) ya son
 *   instantes absolutos correctos y se parsean tal cual.
 */
export function parseDbTimestamp(value: string | null | undefined): Date {
  if (!value) return new Date(NaN)
  const s = String(value).trim()

  // ¿Ya trae zona horaria? (Z final u offset ±HH:MM / ±HHMM)
  const hasZone = /[zZ]$/.test(s) || /[+-]\d{2}:?\d{2}$/.test(s)
  if (hasZone) return new Date(s)

  // Texto naive ("YYYY-MM-DD HH:MM:SS" o con "T"): tratarlo como UTC.
  const iso = s.replace(" ", "T")
  const utc = new Date(`${iso}Z`)
  return Number.isNaN(utc.getTime()) ? new Date(s) : utc
}

/** Fecha corta en hora de Colombia, p. ej. "2 jun". */
export function formatBogotaShortDate(value: string): string {
  return parseDbTimestamp(value).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: COLOMBIA_TZ,
  })
}

/** Hora corta en hora de Colombia, p. ej. "10:30". */
export function formatBogotaTime(value: string): string {
  return parseDbTimestamp(value).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: COLOMBIA_TZ,
  })
}

/** Fecha con formato configurable en hora de Colombia. Para instantes (timestamps). */
export function formatBogotaDate(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return parseDbTimestamp(value).toLocaleDateString("es-ES", { ...options, timeZone: COLOMBIA_TZ })
}

/** Fecha y hora completas en hora de Colombia. */
export function formatBogotaDateTime(value: string): string {
  return parseDbTimestamp(value).toLocaleString("es-ES", { timeZone: COLOMBIA_TZ })
}

/**
 * Formatea un valor de SOLO fecha ("YYYY-MM-DD") mostrando su valor literal,
 * sin desplazarlo por zona horaria. Evita el clásico off-by-one en que
 * `new Date("2026-06-02")` (medianoche UTC) se renderiza como el día anterior
 * en Colombia (UTC-5).
 */
export function formatDateOnly(dateOnly: string, options?: Intl.DateTimeFormatOptions): string {
  return parseDbTimestamp(dateOnly).toLocaleDateString("es-ES", { timeZone: "UTC", ...options })
}

/** Hora del día (0-23) en Colombia para un timestamp dado. */
export function getBogotaHour(value: string): number {
  const d = parseDbTimestamp(value)
  if (Number.isNaN(d.getTime())) return 0
  // Offset fijo UTC-5: desplazamos el instante y leemos campos UTC.
  const bogota = new Date(d.getTime() + COLOMBIA_OFFSET_MINUTES * 60_000)
  return bogota.getUTCHours()
}

/** Convierte un Date a "YYYY-MM-DD" según el día calendario en Colombia. */
export function toBogotaDateStr(date: Date): string {
  // El locale "en-CA" formatea como YYYY-MM-DD.
  return date.toLocaleDateString("en-CA", { timeZone: COLOMBIA_TZ })
}

/** Fecha de hoy "YYYY-MM-DD" en Colombia. */
export function todayColombia(): string {
  return toBogotaDateStr(new Date())
}

/**
 * Fecha y hora actuales coherentes con Colombia (UTC-5).
 * Reemplaza el cálculo basado en la zona del servidor (UTC en Vercel).
 */
export function nowColombia(): {
  date: string
  time: string
  hour: number
  timestamp: string
} {
  const now = new Date()
  return {
    date: todayColombia(),
    time: now.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: COLOMBIA_TZ,
    }),
    hour: getBogotaHour(now.toISOString()),
    // Instante absoluto en UTC (correcto): al re-parsearse conserva la hora real.
    timestamp: now.toISOString(),
  }
}
