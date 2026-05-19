import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "your-secret-key-change-in-production")

const publicPaths = ["/login", "/register", "/2fa", "/forgot-password", "/reset-password"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir acceso a rutas públicas
  if (publicPaths.includes(pathname)) {
    return NextResponse.next()
  }

  // Verificar token
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    // Proteger rutas de admin
    if (pathname.startsWith("/admin")) {
      if (payload.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }

    // Redirigir admin al panel admin si intenta entrar al dashboard de usuario
    if (pathname === "/dashboard" && payload.role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url))
    }

    return NextResponse.next()
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url))
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)"],
}
