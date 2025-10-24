import type React from "react"
import { AppNav } from "./app-nav"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppNav />
      <main className="container pb-20 pt-6 md:pb-6 md:pt-20">{children}</main>
    </div>
  )
}
