/**
 * GET /api/gemini/test — Diagnóstico de la API de Gemini
 *
 * Verifica:
 * 1. Si GEMINI_API_KEY está configurada
 * 2. Si el key tiene formato válido (empieza por "AIza")
 * 3. Hace una llamada mínima a Gemini y devuelve el resultado real
 *
 * Solo accesible con auth-token válido.
 */

import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { GEMINI_CONFIG } from "@/lib/gemini-config"

export async function GET(request: NextRequest) {
  // Auth básica
  const token = request.cookies.get("auth-token")?.value
  if (!token) return NextResponse.json({ error: "No autenticado" }, { status: 401 })
  const user = await verifyToken(token)
  if (!user) return NextResponse.json({ error: "Token inválido" }, { status: 401 })

  const apiKey = process.env.GEMINI_API_KEY
  const model = GEMINI_CONFIG.model

  // 1. Key no configurada
  if (!apiKey) {
    return NextResponse.json({
      status: "error",
      stage: "config",
      message: "GEMINI_API_KEY no está configurada en .env.local",
      hint: "Agrega GEMINI_API_KEY=AIza... en tu archivo .env.local y reinicia el servidor con pnpm dev",
    })
  }

  // 2. Formato inválido
  if (!apiKey.startsWith("AIza") || apiKey.length < 30) {
    return NextResponse.json({
      status: "error",
      stage: "format",
      message: "GEMINI_API_KEY tiene formato inválido",
      hint: "La clave de Google AI Studio comienza con 'AIza' y tiene ~39 caracteres",
      keyPreview: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
    })
  }

  // 3. Llamada de prueba mínima
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const body = {
    contents: [{ role: "user", parts: [{ text: "Responde solo la palabra: OK" }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 10 },
  }

  try {
    const t0 = Date.now()
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const elapsed = Date.now() - t0

    if (!res.ok) {
      const errorBody = await res.text()
      let hint = ""
      if (res.status === 400) hint = "Request inválido o modelo incorrecto."
      else if (res.status === 401) hint = "API key incorrecta o no activada en Google AI Studio."
      else if (res.status === 403) hint = "API key suspendida, billing desactivado, o el proyecto de Google Cloud no tiene la API habilitada."
      else if (res.status === 429) hint = "Cuota excedida. Espera unos minutos o revisa tu plan en Google AI Studio."
      else if (res.status >= 500) hint = "Error del servidor de Google. Vuelve a intentarlo en unos minutos."

      return NextResponse.json({
        status: "error",
        stage: "api_call",
        httpStatus: res.status,
        message: `Gemini respondió con HTTP ${res.status}`,
        hint,
        keyPreview: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
        rawError: errorBody.substring(0, 500), // máx 500 chars para no exponer datos sensibles
      })
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "(respuesta vacía)"

    return NextResponse.json({
      status: "ok",
      message: "Gemini API funcionando correctamente",
      model,
      responseText: text,
      latencyMs: elapsed,
      keyPreview: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
    })
  } catch (err) {
    return NextResponse.json({
      status: "error",
      stage: "network",
      message: "Error de red al conectar con Gemini",
      hint: "Verifica tu conexión a internet. Si estás en desarrollo, asegúrate de que el servidor pueda alcanzar generativelanguage.googleapis.com",
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}
