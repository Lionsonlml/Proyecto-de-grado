import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    status: "ok",
    hasGoogleClientId: !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    hasEncryptionKey: !!process.env.ENCRYPTION_KEY,
    hasGoogleSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
    nodeEnv: process.env.NODE_ENV,
  })
}
