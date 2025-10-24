import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Calendar, Smile, Brain } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Acciones Rápidas</CardTitle>
        <CardDescription>Accede rápidamente a las funciones principales</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4 bg-transparent">
          <Link href="/tasks">
            <Plus className="h-5 w-5" />
            <span className="text-sm">Nueva Tarea</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4 bg-transparent">
          <Link href="/schedule">
            <Calendar className="h-5 w-5" />
            <span className="text-sm">Ver Horario</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4 bg-transparent">
          <Link href="/moods">
            <Smile className="h-5 w-5" />
            <span className="text-sm">Registrar Mood</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4 bg-transparent">
          <Link href="/gemini-lab">
            <Brain className="h-5 w-5" />
            <span className="text-sm">Análisis IA</span>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
