"use client"

// ─── AiSourceBadge ────────────────────────────────────────────────────────────
// Indicador de origen de la respuesta IA. No modifica ningún componente existente.
// Uso: <AiSourceBadge source="gemini" cachedAt="2025-02-25T09:00:00Z" />

export type AiSource = "gemini" | "cache" | "fallback"

interface AiSourceBadgeProps {
  source: AiSource
  cachedAt?: string
  className?: string
}

const CONFIG = {
  gemini: {
    dot: "#22c55e",   // verde
    label: "Generado por IA en tiempo real",
  },
  cache: {
    dot: "#eab308",   // amarillo
    label: "Optimizado por Historial",
  },
  fallback: {
    dot: "#f97316",   // naranja
    label: "Modo de Asistencia Local",
  },
} as const

export function AiSourceBadge({ source, cachedAt, className }: AiSourceBadgeProps) {
  const { dot, label } = CONFIG[source]

  const formattedTime =
    source === "cache" && cachedAt
      ? ` · ${new Date(cachedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
      : ""

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        fontSize: "0.72rem",
        color: "var(--muted-foreground, #6b7280)",
        userSelect: "none",
      }}
      title={source === "cache" && cachedAt ? `Cacheado el ${new Date(cachedAt).toLocaleString("es-ES")}` : undefined}
    >
      <span
        style={{
          display: "inline-block",
          width: "7px",
          height: "7px",
          borderRadius: "50%",
          backgroundColor: dot,
          flexShrink: 0,
        }}
        aria-hidden="true"
      />
      {label}{formattedTime}
    </span>
  )
}
