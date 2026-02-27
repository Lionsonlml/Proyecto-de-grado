# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Reglas de Oro (no negociables)

1. **No tocar estilos**: Prohibido modificar clases Tailwind, archivos CSS o componentes UI existentes en `components/ui/`. Cambios visuales solo si el usuario lo pide explícitamente.
2. **Backend first**: Prioridad en estabilidad del servidor, seguridad y optimización de cuotas de la API de Gemini.
3. **Capacitor es parte del stack**: Cualquier cambio de routing, assets o build debe ser compatible con Capacitor (empaquetado nativo Android/iOS). Evitar APIs exclusivas de browser que no funcionen en WebView de Capacitor.

## Comandos

```bash
pnpm dev        # Servidor de desarrollo en http://localhost:3000
pnpm build      # Build de producción
pnpm start      # Servidor de producción
pnpm lint       # ESLint
```

**Gestor de paquetes: pnpm** (no usar npm ni yarn).

## Stack real (de package.json)

- **Next.js 15.2.4** + React 19 + TypeScript 5
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **shadcn/ui** (Radix UI + class-variance-authority)
- **@libsql/client 0.15.15** — SQLite local vía libSQL
- **jose 5** — JWT (no jsonwebtoken, aunque está instalado)
- **bcryptjs** — hashing de contraseñas
- **@google/generative-ai 0.24.1** — Gemini AI (solo servidor)
- **recharts** — gráficas en el dashboard
- **react-hook-form + zod** — formularios con validación

No hay Capacitor. `@react-native-community/cli` está en devDependencies pero no se usa activamente.

## Variables de entorno

Copiar `env.example` a `.env.local`:

```
JWT_SECRET=       # Firmar tokens JWT (mínimo 32 caracteres)
ENCRYPTION_KEY=   # Clave AES-256 para cifrado en BD (mínimo 32 caracteres)
GEMINI_API_KEY=   # Opcional — sin ella la app usa modo demo local
```

## Arquitectura

**Next.js App Router** configurado como PWA (service worker en `public/sw.js`, manifest en `public/manifest.json`). TypeScript errors **no bloquean el build** (`ignoreBuildErrors: true` en `next.config.mjs`).

---

### Base de datos — esquema real (`lib/db.ts`)

SQLite local en `data/app.db` via `@libsql/client`. El cliente es un singleton que se auto-inicializa al primer uso y crea las tablas si no existen. El seed de usuarios de prueba se ejecuta automáticamente si `users` está vacía.

```
users            id, email, password, name, created_at, updated_at
tasks            id, user_id, title†, description†, category, priority, status,
                 duration, completed, hour, date, due_date, tags†,
                 started_at, time_elapsed, completed_at, created_at, updated_at
moods            id, user_id, energy(1-5), focus(1-5), stress(1-5), type, hour(0-23),
                 date, notes†, created_at, updated_at
ai_insights      id, user_id, prompt†, response†, analysis_type, metadata†, created_at
user_preferences id, user_id, data_collection, ai_analysis, data_sharing,
                 marketing_emails, analytics_tracking, created_at, updated_at
consents         id, user_id, scope, accepted, version, accepted_at, ip_address, user_agent
user_roles       id, user_id, role('user'|'moderator'|'admin'), created_at
data_access_logs id, user_id, action, data_type, target_user_id, ip_address, user_agent, accessed_at
```

`†` = campo cifrado en reposo con AES-256-CBC (ver sección de cifrado).

Índices definidos en el esquema: `tasks(user_id, date)`, `tasks(status)`, `moods(user_id, date)`, `ai_insights(user_id)`, y uno por cada tabla secundaria.

---

### Capa de datos segura (`lib/secure-data.ts`)

**Todo el acceso a datos pasa por aquí**, no por las funciones de `lib/auth.ts` (que son legacy). Las funciones de `secure-data` hacen tres cosas automáticamente:
1. Verifican permisos RBAC (`canAccessUserData` de `lib/roles.ts`)
2. Cifran al escribir / descifran al leer
3. Registran el acceso en `data_access_logs`

Funciones clave:
- `getSecureUserTasks / saveSecureTask / updateSecureTask / deleteSecureTask`
- `getSecureUserMoods / saveSecureMood`
- `getSecureUserInsights / saveSecureInsight`
- `getGeminiUserTasks / getGeminiUserMoods` — variantes **sin descifrar**, para enviar a Gemini (la IA recibe los datos en texto cifrado)

---

### Cifrado en reposo (`lib/encryption.ts`)

Algoritmo: AES-256-CBC. La clave se deriva de `ENCRYPTION_KEY` via `crypto.scryptSync`.
Formato almacenado en BD: `iv_hex:ciphertext_hex`.

Campos cifrados:
- `tasks`: title, description, tags
- `moods`: notes
- `ai_insights`: prompt, response, metadata

`isEncrypted(str)` detecta si una cadena ya está cifrada. Si no lo está, `decryptSensitiveData` la devuelve tal cual (retrocompatibilidad con datos seed no cifrados).

---

### Autenticación

**Cookie name: `auth-token`** (httpOnly, secure en producción, sameSite=strict, 7 días).

Flujo:
1. `POST /api/auth/login` — verifica credenciales y emite la cookie `auth-token`
2. `POST /api/auth/logout` — vacía la cookie `auth-token`
3. `GET /api/auth/me` — devuelve el usuario actual leyendo `auth-token`
4. Rutas API — cada handler lee `auth-token` manualmente y llama `verifyToken()`

> ⚠️ **Bug conocido en `middleware.ts`**: El middleware lee la cookie `"token"` (línea 18), pero el login establece `"auth-token"`. Esto significa que el middleware de Next.js **no protege las páginas correctamente** — redirige a `/login` aunque el usuario esté autenticado. La protección real la hacen los propios handlers de API. Antes de cualquier trabajo en auth, corregir el nombre de cookie en `middleware.ts` de `"token"` a `"auth-token"`.

---

### RBAC (`lib/roles.ts`)

Tres roles: `user`, `moderator`, `admin`. Permisos definidos en `ROLE_PERMISSIONS`. Si un usuario no tiene registro en `user_roles`, se le asigna `user` automáticamente. Los accesos se auditan en `data_access_logs`.

`lib/security-middleware.ts` expone helpers reutilizables: `requireAuth`, `requireUserDataAccess`, `requireAdmin`, `requirePrivacyConsent`, `checkRateLimit`.

---

### Gemini AI (`lib/gemini-config.ts`)

Modelo real: **`gemini-2.0-flash`** (no 1.5 Flash como dice el README).
La API key solo se expone en servidor (`getGeminiApiKey()` lanza si se llama desde cliente).
Sin `GEMINI_API_KEY`, los endpoints de `/api/gemini/*` generan análisis locales y devuelven `demo: true`.

Endpoints disponibles:
- `POST /api/gemini/analyze` — análisis de patrones de productividad
- `POST /api/gemini/insight` — insight personalizado
- `POST /api/gemini/evaluate` — evaluación de rendimiento
- `POST /api/gemini/advice` — consejos
- `POST /api/gemini/motivational` — mensajes motivacionales
- `POST /api/schedule/optimize` — generación de horario optimizado

---

### Rutas de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/login`, `/register` | Públicas (excluidas del matcher del middleware) |
| `/dashboard` | Panel principal con stats, gráficas recharts |
| `/tasks` | CRUD de tareas |
| `/moods` | Registro de estados de ánimo |
| `/schedule` | Horarios optimizados por Gemini |
| `/gemini-lab` | Laboratorio de pruebas de IA |
| `/privacy` | Gestión de consentimientos y exportación de datos |
| `/offline` | Página offline del PWA |

---

## Usuarios de prueba (seed automático)

| Email | Contraseña | Perfil |
|-------|-----------|--------|
| maria@test.com | password123 | Productividad matutina — tareas y moods AM |
| juan@test.com | password123 | Productividad vespertina — tareas y moods PM |
| admin@test.com | admin123 | Sin rol admin asignado en seed |

> Los datos de seed (tareas y moods) **no están cifrados** en la BD inicial. `decryptSensitiveData` los devuelve sin error gracias a la lógica de `isEncrypted()`.

## Notas para desarrollo

- SQLite en `data/` **no funciona en entornos serverless**. En Vercel requeriría migrar a Turso remote.
- Los tipos centrales están en `lib/types.ts` (Task, Mood, TimeBlock).
- Las rutas de test (`/api/test-db`, `/api/test-deepseek`, `/api/test-openai`, `/api/test-evaluation`) son endpoints de desarrollo sin protección de auth.
- `lib/storage.ts` y `lib/gemini-client.ts` son módulos legacy del lado cliente — el flujo actual usa las rutas API.
