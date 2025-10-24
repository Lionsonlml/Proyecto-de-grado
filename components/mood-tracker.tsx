"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import type { Mood } from "@/lib/types"
import { Frown, Meh, Smile, Laugh, Angry } from "lucide-react"
import { cn } from "@/lib/utils"

interface MoodTrackerProps {
  onSubmit: (mood: Omit<Mood, "id" | "timestamp">) => void
}

const moodOptions: Array<{ value: Mood["mood"]; label: string; icon: typeof Smile; color: string }> = [
  { value: "muy-mal", label: "Muy Mal", icon: Angry, color: "text-red-600" },
  { value: "mal", label: "Mal", icon: Frown, color: "text-orange-600" },
  { value: "neutral", label: "Neutral", icon: Meh, color: "text-yellow-600" },
  { value: "bien", label: "Bien", icon: Smile, color: "text-green-600" },
  { value: "excelente", label: "Excelente", icon: Laugh, color: "text-emerald-600" },
]

export function MoodTracker({ onSubmit }: MoodTrackerProps) {
  const [selectedMood, setSelectedMood] = useState<Mood["mood"]>("neutral")
  const [energy, setEnergy] = useState([3])
  const [focus, setFocus] = useState([3])
  const [stress, setStress] = useState([3])
  const [notes, setNotes] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      mood: selectedMood,
      energy: energy[0],
      focus: focus[0],
      stress: stress[0],
      notes: notes || undefined,
    })
    // Reset form
    setSelectedMood("neutral")
    setEnergy([3])
    setFocus([3])
    setStress([3])
    setNotes("")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar Estado de Ánimo</CardTitle>
        <CardDescription>Registra cómo te sientes en este momento</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Mood Selection */}
          <div className="space-y-3">
            <Label>¿Cómo te sientes?</Label>
            <div className="grid grid-cols-5 gap-2">
              {moodOptions.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMood(option.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105",
                      selectedMood === option.value
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border hover:border-primary/50",
                    )}
                  >
                    <Icon
                      className={cn("h-8 w-8", selectedMood === option.value ? option.color : "text-muted-foreground")}
                    />
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Nivel de Energía</Label>
              <span className="text-sm font-medium">{energy[0]}/5</span>
            </div>
            <Slider value={energy} onValueChange={setEnergy} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy bajo</span>
              <span>Muy alto</span>
            </div>
          </div>

          {/* Focus Level */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Nivel de Concentración</Label>
              <span className="text-sm font-medium">{focus[0]}/5</span>
            </div>
            <Slider value={focus} onValueChange={setFocus} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy bajo</span>
              <span>Muy alto</span>
            </div>
          </div>

          {/* Stress Level */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Nivel de Estrés</Label>
              <span className="text-sm font-medium">{stress[0]}/5</span>
            </div>
            <Slider value={stress} onValueChange={setStress} min={1} max={5} step={1} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Muy bajo</span>
              <span>Muy alto</span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="¿Qué está afectando tu estado de ánimo?"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full">
            Guardar Registro
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
