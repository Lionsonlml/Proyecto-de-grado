import { NextResponse, type NextRequest } from "next/server"
import { verifyToken } from "@/lib/auth"
import { evaluateResponse } from "@/lib/ai-evaluator"

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 })
    }

    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 })
    }

    const { response, analysisType, context } = await request.json()

    if (!response || !analysisType) {
      return NextResponse.json(
        { error: "Respuesta y tipo de análisis requeridos" },
        { status: 400 }
      )
    }

    const evaluation = await evaluateResponse(response, analysisType, context)

    return NextResponse.json({ success: true, evaluation })
  } catch (error) {
    console.error("[evaluate] Error:", error)
    return NextResponse.json({ error: "Error evaluando la respuesta" }, { status: 500 })
  }
}
