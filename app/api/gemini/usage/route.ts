/**
 * /api/gemini/usage — Consumo real y cuota de la API de Gemini.
 *
 * GET  → Resumen del consumo. Para admins incluye tokens reales, coste estimado,
 *        tier de la key y preview de la key. Para usuarios normales devuelve solo
 *        el porcentaje de cuota usado (para el aviso del laboratorio).
 * PUT  → (solo admin) Cambia el tier declarado de la key: { tier: "free" | "paid" }.
 *
 * Los tokens provienen de `usageMetadata` que Gemini devuelve en cada llamada y se
 * registran en la tabla gemini_usage (a nivel de key). Google no expone la cuota
 * en vivo, por lo que "lo que queda" es una estimación frente al plan declarado.
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { GEMINI_CONFIG } from "@/lib/gemini-config"
import { getUsageSummary, setKeyTier } from "@/lib/gemini-usage"

function keyInfo(): { keyConfigured: boolean; keyPreview: string | null } {
  const k = process.env.GEMINI_API_KEY
  if (!k) return { keyConfigured: false, keyPreview: null }
  return { keyConfigured: true, keyPreview: `${k.slice(0, 6)}...${k.slice(-4)}` }
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  try {
    const summary = await getUsageSummary()

    // Usuarios no admin: payload mínimo (solo para el aviso de cuota del laboratorio).
    if (user.role !== "admin") {
      return NextResponse.json({
        tier: summary.tier,
        daily: { percentUsed: summary.daily.percentUsed, requestsRemaining: summary.daily.requestsRemaining },
        limits: summary.limits,
        reset: summary.reset,
      })
    }

    // Admin: datos completos y reales.
    return NextResponse.json({
      ...summary,
      model: GEMINI_CONFIG.model,
      ...keyInfo(),
      note:
        "El consumo se calcula con los tokens reales (usageMetadata) que Gemini devuelve en cada llamada, " +
        "registrados a nivel de la API key. La cuota restante es una estimación frente a los límites del plan: " +
        "Google no expone la cuota en vivo. La caché y los fallbacks no consumen cuota.",
    })
  } catch (error) {
    console.error("[gemini/usage] GET Error:", error)
    return NextResponse.json({ error: "No se pudo calcular el uso" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const user = await verifyToken(token)
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const tier = body?.tier
    if (tier !== "free" && tier !== "paid") {
      return NextResponse.json({ error: "tier inválido (usa 'free' o 'paid')" }, { status: 400 })
    }
    await setKeyTier(tier)
    return NextResponse.json({ ok: true, tier })
  } catch (error) {
    console.error("[gemini/usage] PUT Error:", error)
    return NextResponse.json({ error: "No se pudo actualizar el tier" }, { status: 500 })
  }
}
