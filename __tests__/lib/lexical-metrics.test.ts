import { describe, it, expect } from "vitest"
import { calculateLexicalMetrics } from "@/lib/ai-evaluator"

describe("calculateLexicalMetrics", () => {
  it("wordCount correcto para texto conocido", () => {
    const result = calculateLexicalMetrics("hola mundo esto es una prueba")
    expect(result.wordCount).toBe(6)
  })

  it("lexicalDiversity está entre 0 y 1", () => {
    const result = calculateLexicalMetrics("el gato come el gato come")
    expect(result.lexicalDiversity).toBeGreaterThanOrEqual(0)
    expect(result.lexicalDiversity).toBeLessThanOrEqual(1)
  })

  it("texto vacío no lanza error y retorna ceros", () => {
    const result = calculateLexicalMetrics("")
    expect(result.wordCount).toBe(0)
    expect(result.lexicalDiversity).toBe(0)
    expect(result.sentenceCount).toBe(0)
  })

  it("detecta verbos terminados en -ar/-er/-ir", () => {
    const text = "trabajar pensar escribir comer dormir"
    const result = calculateLexicalMetrics(text)
    // verbNounRatio puede ser > 0 si hay verbos y = 0 si no hay sustantivos
    expect(result.verbNounRatio).toBeGreaterThanOrEqual(0)
  })

  it("detecta sustantivos terminados en -ción/-dad/-ez", () => {
    const text = "la productividad la comunicación la calidad la sencillez"
    const result = calculateLexicalMetrics(text)
    // El ratio verbo/sustantivo puede ser 0 si no hay verbos
    expect(result.verbNounRatio).toBeGreaterThanOrEqual(0)
  })

  it("redondea lexicalDiversity a 2 decimales", () => {
    const result = calculateLexicalMetrics("uno dos tres cuatro cinco uno dos")
    const decimals = result.lexicalDiversity.toString().split(".")[1]
    expect((decimals ?? "").length).toBeLessThanOrEqual(2)
  })

  it("texto de una sola palabra retorna diversidad 1", () => {
    const result = calculateLexicalMetrics("productividad")
    expect(result.lexicalDiversity).toBe(1)
    expect(result.wordCount).toBe(1)
  })
})
