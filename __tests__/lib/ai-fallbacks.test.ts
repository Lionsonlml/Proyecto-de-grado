import { describe, it, expect } from "vitest"
import {
  FALLBACK_ADVICE_TIPS,
  FALLBACK_PATTERNS,
  FALLBACK_SCHEDULE,
  FALLBACK_MOTIVATIONAL,
  getRandomAdvice,
  getRandomMotivational,
} from "@/lib/ai-fallbacks"

describe("FALLBACK_ADVICE_TIPS", () => {
  it("tiene al menos 30 consejos", () => {
    expect(FALLBACK_ADVICE_TIPS.length).toBeGreaterThanOrEqual(30)
  })

  it("todos los tips son strings no vacíos", () => {
    for (const tip of FALLBACK_ADVICE_TIPS) {
      expect(typeof tip).toBe("string")
      expect(tip.trim().length).toBeGreaterThan(0)
    }
  })

  it("getRandomAdvice() retorna un valor del array", () => {
    const advice = getRandomAdvice()
    expect(FALLBACK_ADVICE_TIPS).toContain(advice)
  })
})

describe("FALLBACK_PATTERNS", () => {
  it("source es 'fallback'", () => {
    expect(FALLBACK_PATTERNS.source).toBe("fallback")
  })

  it("tiene patterns, correlations y recommendations como arrays", () => {
    expect(Array.isArray(FALLBACK_PATTERNS.patterns)).toBe(true)
    expect(Array.isArray(FALLBACK_PATTERNS.correlations)).toBe(true)
    expect(Array.isArray(FALLBACK_PATTERNS.recommendations)).toBe(true)
  })
})

describe("FALLBACK_SCHEDULE", () => {
  it("schedule[0] tiene { time, task, duration, reason }", () => {
    const first = FALLBACK_SCHEDULE.schedule[0]
    expect(first).toHaveProperty("time")
    expect(first).toHaveProperty("task")
    expect(first).toHaveProperty("duration")
    expect(first).toHaveProperty("reason")
  })

  it("source es 'fallback'", () => {
    expect(FALLBACK_SCHEDULE.source).toBe("fallback")
  })
})

describe("FALLBACK_MOTIVATIONAL + getRandomMotivational", () => {
  it("tiene al menos 10 frases", () => {
    expect(FALLBACK_MOTIVATIONAL.length).toBeGreaterThanOrEqual(10)
  })

  it("getRandomMotivational() retorna un valor del array", () => {
    const quote = getRandomMotivational()
    expect(FALLBACK_MOTIVATIONAL).toContain(quote)
  })
})
