import { vi } from "vitest"

// ─── Mock global de @/lib/db ─────────────────────────────────────────────────
// Evita que los tests llamen a Turso real.

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  })),
  ensureDbReady: vi.fn().mockResolvedValue(undefined),
}))

// ─── Variables de entorno mínimas ─────────────────────────────────────────────
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long!!"
process.env.ENCRYPTION_KEY = "test-encryption-key-32chars-long!!"
process.env.GEMINI_API_KEY = "test-gemini-api-key"
process.env.TURSO_DATABASE_URL = "libsql://test.turso.io"
process.env.TURSO_AUTH_TOKEN = "test-token"
