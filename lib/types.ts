export interface Task {
  id: string
  title: string
  description?: string
  category: "trabajo" | "personal" | "estudio" | "salud" | "otro"
  priority: "baja" | "media" | "alta" | "urgente"
  status: "pendiente" | "en-progreso" | "completada" | "cancelada"
  estimatedMinutes?: number
  actualMinutes?: number
  hour?: number
  dueDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  tags?: string[]
  startedAt?: string
  timeElapsed?: number
}

export interface Mood {
  id: string
  mood: "muy-mal" | "mal" | "neutral" | "bien" | "excelente"
  energy: number // 1-5
  focus: number // 1-5
  stress: number // 1-5
  notes?: string
  timestamp: string
}

export interface TimeBlock {
  id: string
  taskId?: string
  title: string
  startTime: string
  endTime: string
  date: string
  type: "tarea" | "descanso" | "reunion" | "otro"
  completed: boolean
}
