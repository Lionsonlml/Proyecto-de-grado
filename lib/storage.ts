import type { Task, Mood, TimeBlock } from "./types"

// Client-side storage usando localStorage
export const storage = {
  // Tasks
  getTasks: (): Task[] => {
    if (typeof window === "undefined") return []
    const tasks = localStorage.getItem("timewize_tasks")
    return tasks ? JSON.parse(tasks) : []
  },

  saveTasks: (tasks: Task[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("timewize_tasks", JSON.stringify(tasks))
  },

  addTask: (task: Omit<Task, "id" | "createdAt" | "updatedAt">): Task => {
    const tasks = storage.getTasks()
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    tasks.push(newTask)
    storage.saveTasks(tasks)
    return newTask
  },

  updateTask: (id: string, updates: Partial<Task>): Task | null => {
    const tasks = storage.getTasks()
    const index = tasks.findIndex((t) => t.id === id)
    if (index === -1) return null

    tasks[index] = {
      ...tasks[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    storage.saveTasks(tasks)
    return tasks[index]
  },

  deleteTask: (id: string): boolean => {
    const tasks = storage.getTasks()
    const filtered = tasks.filter((t) => t.id !== id)
    if (filtered.length === tasks.length) return false
    storage.saveTasks(filtered)
    return true
  },

  // Moods
  getMoods: (): Mood[] => {
    if (typeof window === "undefined") return []
    const moods = localStorage.getItem("timewize_moods")
    return moods ? JSON.parse(moods) : []
  },

  saveMoods: (moods: Mood[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("timewize_moods", JSON.stringify(moods))
  },

  addMood: (mood: Omit<Mood, "id" | "timestamp">): Mood => {
    const moods = storage.getMoods()
    const newMood: Mood = {
      ...mood,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    moods.push(newMood)
    storage.saveMoods(moods)
    return newMood
  },

  // Time Blocks
  getTimeBlocks: (): TimeBlock[] => {
    if (typeof window === "undefined") return []
    const blocks = localStorage.getItem("timewize_timeblocks")
    return blocks ? JSON.parse(blocks) : []
  },

  saveTimeBlocks: (blocks: TimeBlock[]) => {
    if (typeof window === "undefined") return
    localStorage.setItem("timewize_timeblocks", JSON.stringify(blocks))
  },

  addTimeBlock: (block: Omit<TimeBlock, "id">): TimeBlock => {
    const blocks = storage.getTimeBlocks()
    const newBlock: TimeBlock = {
      ...block,
      id: crypto.randomUUID(),
    }
    blocks.push(newBlock)
    storage.saveTimeBlocks(blocks)
    return newBlock
  },

  updateTimeBlock: (id: string, updates: Partial<TimeBlock>): TimeBlock | null => {
    const blocks = storage.getTimeBlocks()
    const index = blocks.findIndex((b) => b.id === id)
    if (index === -1) return null

    blocks[index] = { ...blocks[index], ...updates }
    storage.saveTimeBlocks(blocks)
    return blocks[index]
  },

  deleteTimeBlock: (id: string): boolean => {
    const blocks = storage.getTimeBlocks()
    const filtered = blocks.filter((b) => b.id !== id)
    if (filtered.length === blocks.length) return false
    storage.saveTimeBlocks(filtered)
    return true
  },
}
