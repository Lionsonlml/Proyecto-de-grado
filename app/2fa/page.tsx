"use client"

import { Suspense, useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Brain, Loader2, ShieldCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { saveAuthToken } from "@/lib/capacitor-auth"

function TwoFactorContent() {
  const [code, setCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [codeSent, setCodeSent] = useState(false)
  const [devCode, setDevCode] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const tempToken = searchParams.get("tempToken") ?? ""

  useEffect(() => {
    if (tempToken) sendCode()
  }, [tempToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function sendCode() {
    if (!tempToken) return
    setSending(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/auth/2fa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Error al enviar el código")
        return
      }
      setCodeSent(true)
      if (data.code) setDevCode(data.code)
      inputRef.current?.focus()
    } catch {
      setErrorMsg("Error de conexión")
    } finally {
      setSending(false)
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length !== 6) return
    setLoading(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? "Código incorrecto")
        return
      }
      if (data.token) await saveAuthToken(data.token)
      toast({ title: "¡Verificado!", description: "Acceso concedido" })
      router.push("/dashboard")
      router.refresh()
    } catch {
      setErrorMsg("Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  function handleCodeChange(val: string) {
    const numeric = val.replace(/\D/g, "").slice(0, 6)
    setCode(numeric)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
              <Brain className="h-5 w-5" />
              <span className="font-semibold">Timewize</span>
            </div>
          </div>
          <div className="flex justify-center">
            <ShieldCheck className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Verificación en dos pasos</CardTitle>
          <CardDescription className="text-center">
            {codeSent
              ? "Ingresa el código de 6 dígitos enviado a tu email"
              : "Enviando código a tu correo..."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="text-center text-2xl tracking-widest"
              disabled={loading || !codeSent}
            />

            {devCode && (
              <div className="p-3 rounded-md bg-yellow-500/10 border border-yellow-500/30 text-sm text-yellow-600 dark:text-yellow-400">
                <strong>[DEV]</strong> Código: <strong>{devCode}</strong>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                {errorMsg}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || code.length !== 6 || !codeSent}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Verificar código"
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={sending}
              onClick={sendCode}
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Reenviar código"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function TwoFactorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <TwoFactorContent />
    </Suspense>
  )
}
