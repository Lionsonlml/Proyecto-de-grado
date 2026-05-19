import { describe, it, expect } from "vitest"
import {
  encryptSensitiveData,
  decryptSensitiveData,
  isEncrypted,
  encryptTaskData,
  decryptTaskData,
  encryptMoodNotes,
  decryptMoodNotes,
  encryptField,
  decryptField,
  sanitizeSensitiveData,
} from "@/lib/encryption"

// ─── isEncrypted ─────────────────────────────────────────────────────────────

describe("isEncrypted", () => {
  it("retorna false para texto plano", () => {
    expect(isEncrypted("Reunión con el equipo")).toBe(false)
  })

  it("retorna false para cadena vacía", () => {
    expect(isEncrypted("")).toBe(false)
  })

  it("retorna false si el IV no tiene los 32 chars hex esperados", () => {
    // IV demasiado corto
    expect(isEncrypted("aabbcc:deadbeef")).toBe(false)
  })

  it("retorna false si no tiene el separador ':'", () => {
    expect(isEncrypted("abcdef1234567890")).toBe(false)
  })

  it("retorna true para un dato correctamente cifrado", () => {
    const encrypted = encryptSensitiveData("texto de prueba")
    expect(isEncrypted(encrypted)).toBe(true)
  })
})

// ─── encryptSensitiveData / decryptSensitiveData ──────────────────────────────

describe("encryptSensitiveData / decryptSensitiveData", () => {
  it("roundtrip: descifrar el resultado devuelve el valor original", () => {
    const original = "Mi tarea muy importante"
    expect(decryptSensitiveData(encryptSensitiveData(original))).toBe(original)
  })

  it("el dato cifrado es distinto al input", () => {
    const original = "texto sensible"
    expect(encryptSensitiveData(original)).not.toBe(original)
  })

  it("formato del cifrado es iv_hex:ciphertext_hex con IV de 32 chars", () => {
    const encrypted = encryptSensitiveData("prueba")
    const parts = encrypted.split(":")
    expect(parts).toHaveLength(2)
    expect(parts[0]).toHaveLength(32) // 16 bytes IV → 32 hex chars
    expect(parts[1].length).toBeGreaterThan(0)
  })

  it("dos cifrados del mismo texto producen resultados distintos (IV aleatorio)", () => {
    const text = "mismo texto siempre"
    expect(encryptSensitiveData(text)).not.toBe(encryptSensitiveData(text))
  })

  it("decryptSensitiveData devuelve texto plano sin modificar si no está cifrado", () => {
    expect(decryptSensitiveData("texto sin cifrar")).toBe("texto sin cifrar")
  })

  it("cadenas largas se cifran y descifran correctamente", () => {
    const long = "a".repeat(500)
    expect(decryptSensitiveData(encryptSensitiveData(long))).toBe(long)
  })

  it("caracteres especiales y UTF-8 se manejan correctamente", () => {
    const special = "tarea: análisis de datos 📊 (urgente) — revisión"
    expect(decryptSensitiveData(encryptSensitiveData(special))).toBe(special)
  })
})

// ─── encryptTaskData / decryptTaskData ───────────────────────────────────────

describe("encryptTaskData / decryptTaskData", () => {
  it("roundtrip de title, description y tags", () => {
    const original = { title: "Reunión", description: "Notas importantes", tags: "trabajo,urgente" }
    const encrypted = encryptTaskData(original)
    const decrypted = decryptTaskData(encrypted)
    expect(decrypted.title).toBe(original.title)
    expect(decrypted.description).toBe(original.description)
    expect(decrypted.tags).toBe(original.tags)
  })

  it("description null permanece null tras cifrar", () => {
    const result = encryptTaskData({ title: "Solo título", description: null })
    expect(result.description).toBeNull()
  })

  it("tags null permanece null tras cifrar", () => {
    const result = encryptTaskData({ title: "Sin tags", tags: null })
    expect(result.tags).toBeNull()
  })

  it("el título cifrado es diferente al original", () => {
    const encrypted = encryptTaskData({ title: "Mi tarea" })
    expect(encrypted.title).not.toBe("Mi tarea")
    expect(isEncrypted(encrypted.title)).toBe(true)
  })
})

// ─── encryptMoodNotes / decryptMoodNotes ─────────────────────────────────────

describe("encryptMoodNotes / decryptMoodNotes", () => {
  it("null devuelve null en ambas funciones", () => {
    expect(encryptMoodNotes(null)).toBeNull()
    expect(decryptMoodNotes(null)).toBeNull()
  })

  it("cadena vacía devuelve null al cifrar", () => {
    expect(encryptMoodNotes("")).toBeNull()
    expect(encryptMoodNotes("   ")).toBeNull()
  })

  it("roundtrip: cifrar y descifrar notas del mood", () => {
    const notes = "Me siento con mucha energía hoy y muy productivo"
    const encrypted = encryptMoodNotes(notes)!
    expect(encrypted).not.toBeNull()
    expect(decryptMoodNotes(encrypted)).toBe(notes)
  })
})

// ─── encryptField / decryptField ─────────────────────────────────────────────

describe("encryptField / decryptField", () => {
  it("null devuelve null en ambas funciones", () => {
    expect(encryptField(null)).toBeNull()
    expect(decryptField(null)).toBeNull()
  })

  it("undefined devuelve null", () => {
    expect(encryptField(undefined)).toBeNull()
    expect(decryptField(undefined)).toBeNull()
  })

  it("roundtrip para string", () => {
    const value = "dato sensible"
    const encrypted = encryptField(value)!
    expect(decryptField(encrypted)).toBe(value)
  })

  it("número se cifra y descifra como string", () => {
    const encrypted = encryptField(42)!
    expect(decryptField(encrypted)).toBe("42")
  })

  it("booleano true se cifra y descifra como string", () => {
    const encrypted = encryptField(true)!
    expect(decryptField(encrypted)).toBe("true")
  })
})

// ─── sanitizeSensitiveData ───────────────────────────────────────────────────

describe("sanitizeSensitiveData", () => {
  it("reemplaza campos cifrados sensibles con '[Datos cifrados]'", () => {
    const encryptedNotes = encryptSensitiveData("datos privados del usuario")
    const obj = { notes: encryptedNotes, type: "optimista" }
    const sanitized = sanitizeSensitiveData(obj)
    expect(sanitized.notes).toBe("[Datos cifrados]")
    expect(sanitized.type).toBe("optimista")
  })

  it("no modifica campos con texto plano", () => {
    const obj = { description: "texto normal sin cifrar", energy: 4 }
    const sanitized = sanitizeSensitiveData(obj)
    expect(sanitized.description).toBe("texto normal sin cifrar")
  })

  it("no modifica valores no-string", () => {
    const obj = { energy: 4, focus: 3, stress: 2 }
    const sanitized = sanitizeSensitiveData(obj)
    expect(sanitized.energy).toBe(4)
  })

  it("retorna el mismo valor si no es objeto", () => {
    expect(sanitizeSensitiveData(null)).toBeNull()
    expect(sanitizeSensitiveData("texto")).toBe("texto")
  })
})
