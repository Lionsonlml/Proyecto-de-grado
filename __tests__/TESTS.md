# Suite de Tests — TimeWize

**Total:** 151 tests · 17 archivos · 0 fallos

Ejecutar: `pnpm test`
Cobertura: `pnpm test:coverage`

---

## Tipos de test utilizados

Esta suite emplea exclusivamente **tests unitarios** y **tests unitarios con dependencias mockeadas**. A continuación se explica cada tipo y la razón por la que se eligió este enfoque en lugar de alternativas.

### Tests unitarios puros
Prueban una única función o módulo **sin ninguna dependencia externa real**. Las entradas y salidas son completamente deterministas. No hay BD, no hay red, no hay sistema de archivos.

*Ejemplos en este proyecto:* `encryption.test.ts`, `lexical-metrics.test.ts`, `ai-fallbacks.test.ts`, `ai-cache.test.ts` (solo `buildCacheKey`).

### Tests unitarios con dependencias mockeadas
Prueban un módulo que *tiene* dependencias externas (BD, APIs de terceros, otros módulos), pero esas dependencias se reemplazan con **mocks** controlados. El objetivo es aislar la lógica de negocio del módulo bajo prueba.

*Ejemplos en este proyecto:* `auth-utils.test.ts`, `roles.test.ts`, `gemini-caller.test.ts`, `ai-evaluator.test.ts`, todos los tests de API.

### Por qué NO se usan tests de integración
Un test de integración levaría servicios reales: Turso en la nube, Gemini API, servidor Next.js corriendo. Eso implicaría:
- Necesitar credenciales reales (`TURSO_AUTH_TOKEN`, `GEMINI_API_KEY`) en el entorno de CI.
- Consumir cuota real de Gemini (límite 1000 RPD en free tier).
- Velocidad de ejecución de segundos/minutos en lugar de milisegundos.
- Tests no deterministas (dependen de disponibilidad de red y estado de la BD).
- Imposibilidad de ejecutar offline.

La lógica de integración real (cifrado + BD + RBAC funcionando juntos) se verifica manualmente en staging antes de cada deploy a Vercel.

### Por qué NO se usan tests E2E (Playwright/Cypress)
Los tests E2E requieren un browser real, un servidor Next.js levantado y una BD poblada. Son apropiados para validar flujos de usuario completos (login → crear tarea → ver dashboard), pero no para verificar invariantes de seguridad como el algoritmo de cifrado o la lógica de reintentos de Gemini. El costo de mantenimiento sería alto para el beneficio obtenido en un proyecto académico/early-stage.

---

## Resumen de archivos

| Archivo | Tests | Módulo cubierto | Categoría | Tipo de test |
|---------|------:|-----------------|-----------|-------------|
| `lib/encryption.test.ts` | 24 | `lib/encryption.ts` | Seguridad | Unitario puro |
| `lib/auth-utils.test.ts` | 17 | `lib/auth.ts` | Autenticación | Unitario puro |
| `lib/ai-cache.test.ts` | 8 | `lib/ai-cache.ts` | Pipeline IA | Unitario puro / Unitario con mock de BD |
| `lib/roles.test.ts` | 7 | `lib/roles.ts` | RBAC | Unitario con mock de BD |
| `lib/gemini-caller.test.ts` | 6 | `lib/gemini-caller.ts` | Pipeline IA | Unitario con mock de red |
| `lib/ai-evaluator.test.ts` | 5 | `lib/ai-evaluator.ts` | Pipeline IA | Unitario con mock de Gemini |
| `lib/ai-fallbacks.test.ts` | 7 | `lib/ai-fallbacks.ts` | Pipeline IA | Unitario puro |
| `lib/lexical-metrics.test.ts` | 7 | `lib/ai-evaluator.ts` | Pipeline IA | Unitario puro |
| `api/login.test.ts` | 6 | `app/api/auth/login/route.ts` | API Auth | Unitario con mock de auth y BD |
| `api/register.test.ts` | 8 | `app/api/auth/register/route.ts` | API Auth | Unitario con mock de auth y BD |
| `api/tasks.test.ts` | 7 | `app/api/tasks/route.ts` | API Tasks | Unitario con mock de auth y datos |
| `api/moods.test.ts` | 8 | `app/api/moods/route.ts` | API Moods | Unitario con mock de auth y datos |

---

## Detalle de cada suite

---

### `lib/encryption.test.ts` — Cifrado AES-256-CBC

**Módulo:** `lib/encryption.ts`
**Tipo de test:** Unitario puro
**Justificación del tipo:** `lib/encryption.ts` solo depende del módulo nativo `crypto` de Node.js, que está disponible en cualquier entorno sin configuración adicional. No hay BD, red ni estado externo. Cada función es determinista dado el mismo input (salvo el IV aleatorio, que se prueba con roundtrip). Un test de integración no añadiría valor aquí porque el módulo no tiene dependencias que integrar; un test E2E sería innecesariamente costoso para probar un algoritmo matemático.

**Propósito:** Verificar que la capa de cifrado en reposo funciona correctamente. Todos los datos sensibles del usuario (títulos de tareas, notas de mood, etc.) se cifran con AES-256-CBC antes de guardarse en la BD. Un fallo aquí expone información privada del usuario.

**Por qué es necesario:**
- Es el módulo de seguridad más crítico de la aplicación.
- Un error silencioso (datos que "se cifran" pero no se pueden descifrar) destruiría todos los datos del usuario.
- Valida que el formato `iv_hex:ciphertext_hex` se produce y parsea correctamente.

**Qué se prueba:**

| Suite | Tests |
|-------|-------|
| `isEncrypted` | Texto plano → false; cadena vacía → false; IV corto → false; dato real cifrado → true |
| `encryptSensitiveData / decryptSensitiveData` | Roundtrip; cifrado ≠ plaintext; formato iv:payload; IV aleatorio; texto plano pasa sin cambios; cadenas largas; UTF-8 y emojis |
| `encryptTaskData / decryptTaskData` | Roundtrip title+description+tags; null description/tags permanecen null |
| `encryptMoodNotes / decryptMoodNotes` | null → null; string vacío → null; roundtrip |
| `encryptField / decryptField` | null/undefined → null; roundtrip string; número → string |
| `sanitizeSensitiveData` | Campos cifrados → `[Datos cifrados]`; campos planos sin cambios |

---

### `lib/auth-utils.test.ts` — Utilidades de Autenticación

**Módulo:** `lib/auth.ts`
**Tipo de test:** Unitario puro
**Justificación del tipo:** Las funciones probadas (`hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `hashToken`, `readAuthToken`) son todas funciones puras o casi-puras: toman un input, producen un output predecible y no persisten estado. `bcryptjs` y `jose` son librerías locales sin efectos de red. La función `getUserByEmail`/`createUser` que sí toca la BD **no se prueba aquí** — pertenece al flujo de los tests de API donde la BD está mockeada. No se usa test de integración porque verificar si el JWT se almacena en Turso no aporta información sobre si el algoritmo JWT es correcto.

**Propósito:** Verificar las funciones puras de autenticación: hashing de contraseñas, generación y verificación de JWT, hash de tokens para BD, y lectura del token desde request.

**Por qué es necesario:**
- `hashPassword`/`verifyPassword` son la barrera principal contra acceso no autorizado. Un fallo aquí puede permitir que contraseñas incorrectas sean aceptadas.
- `createToken`/`verifyToken` son el mecanismo de sesión. Si el roundtrip falla, los usuarios no pueden iniciar sesión.
- `readAuthToken` es el punto de entrada de autenticación en todos los handlers. Si no lee bien la cookie o el header Bearer, toda la autenticación de Capacitor falla.

**Qué se prueba:**

| Suite | Tests |
|-------|-------|
| `hashPassword / verifyPassword` | Hash ≠ plaintext; verify true para correcta; verify false para incorrecta; salt aleatorio (dos hashes distintos) |
| `createToken / verifyToken` | Roundtrip preserva id/email/name; token inválido → null; cadena vacía → null; formato JWT (3 partes) |
| `hashToken` | 64 chars hex; determinístico; inputs distintos → hashes distintos; solo hex |
| `readAuthToken` | Lee cookie `auth-token`; lee header `Authorization: Bearer`; null si no hay nada; cookie tiene prioridad; ignora `Basic` auth |

---

### `lib/ai-cache.test.ts` — Caché de Respuestas IA

**Módulo:** `lib/ai-cache.ts`
**Tipo de test:** Mixto — Unitario puro (`buildCacheKey`) + Unitario con mock de BD (`getCached`, `setCached`, `logFallback`)
**Justificación del tipo:** `buildCacheKey` es una función de composición de strings: enteramente determinista, cero dependencias externas → test unitario puro. Las funciones `getCached`/`setCached`/`logFallback` llaman a Turso, pero lo que se verifica aquí es su **comportamiento de resiliencia** (nunca lanzar excepción aunque la BD falle) y no el contenido guardado en la BD. Un test de integración real requeriría una instancia de Turso disponible y limpiar el estado entre tests, añadiendo complejidad sin información adicional sobre la lógica de negocio del módulo. Probar que "guarda correctamente en Turso" es responsabilidad del proveedor de BD, no de este código.

**Propósito:** Verificar el sistema de caché que evita llamadas redundantes a Gemini API, reduciendo el consumo de cuota gratuita (1000 RPD en free tier).

**Por qué es necesario:**
- `buildCacheKey` es la función que determina si se usa caché o no. Un error en el formato de la clave produciría cache misses permanentes (desperdicio de cuota) o collisions (respuestas de otro usuario).
- `getCached`/`setCached` deben ser resilientes a fallos de BD — nunca deben romper el flujo principal.

**Qué se prueba:**

| Suite | Tests |
|-------|-------|
| `buildCacheKey` | Formato `tipo:subtipo:fecha`; usa fecha actual si omitida; fechas distintas → claves distintas; tipos distintos → claves distintas |
| `getCached` | Retorna null con BD vacía (mock); nunca lanza excepción |
| `setCached` | Resuelve sin excepción; acepta TTL personalizado |
| `logFallback` | Registra sin excepción |

---

### `lib/roles.test.ts` — Control de Acceso (RBAC)

**Módulo:** `lib/roles.ts`
**Tipo de test:** Unitario con mock de BD
**Justificación del tipo:** Las funciones de roles (`getUserRole`, `getUserPermissions`, `hasPermission`, `canAccessUserData`) leen y escriben en la tabla `user_roles`. Se usa mock de BD porque lo que se quiere probar es la **lógica de decisión de permisos** (la tabla `ROLE_PERMISSIONS` y los condicionales), no que Turso almacena un rol correctamente. El mock retorna `{ rows: [] }` simulando que el usuario no tiene rol asignado, lo que activa el flujo de rol por defecto (`user`) — el camino más frecuente en producción. Si se usara integración real, cada test necesitaría insertar y limpiar registros en `user_roles`, duplicando la complejidad del test sin aumentar la confianza en la lógica.

**Propósito:** Verificar el sistema de roles y permisos que protege el acceso entre usuarios.

**Por qué es necesario:**
- `canAccessUserData` es la guardia principal de privacidad. Si un usuario puede acceder a datos de otro, es una brecha de privacidad grave.
- El rol por defecto (`user`) debe tener todos los permisos elevados en `false`. Si alguno quedara en `true` por error, cualquier usuario podría ver logs de auditoría o exportar datos de otros.

**Qué se prueba:**

| Suite | Tests |
|-------|-------|
| `canAccessUserData` | Mismo userId → true (cortocircuito sin BD); userId diferente + rol user → false |
| `getUserPermissions` | Rol 'user' tiene todos los permisos elevados en false |
| `hasPermission` | `canViewAuditLogs`, `canExportAllData`, `canManageSystem` → false para rol user |

---

### `lib/gemini-caller.test.ts` — Cliente Gemini con Reintentos

**Módulo:** `lib/gemini-caller.ts`
**Tipo de test:** Unitario con mock de red (`fetch`)
**Justificación del tipo:** El único propósito de este módulo es hacer llamadas HTTP a la API de Gemini y gestionar la lógica de reintentos. Se mockea `fetch` global para simular respuestas 200, 429 y 500 sin consumir cuota real ni depender de disponibilidad de red. Esto permite probar exactamente la secuencia de reintentos de forma determinista — algo que sería imposible con la API real (el 429 solo ocurre cuando se agota la cuota). Un test de integración real contra Gemini consumiría cuota, sería lento (~1-2s por llamada) y no se podría reproducir en CI sin la `GEMINI_API_KEY`.

**Propósito:** Verificar que el cliente de Gemini API maneja correctamente errores HTTP y reintentos automáticos.

**Por qué es necesario:**
- La app tiene cuota limitada (free tier). Un error 429 mal manejado que no reintente desperdicia la cuota disponible.
- Un 429 que reintente indefinidamente bloquearía el servidor.
- El error 401 no debe reintentarse (es credencial inválida, no temporal).

**Qué se prueba:**
- Éxito en 1er intento → `{ text, attempts: 1 }`
- 429 → reintento → éxito → `attempts: 2`
- 429 × 2 → `GeminiRetryError` con `reason: 'Quota Exceeded (429)'`
- 401 → error inmediato sin retry (1 sola llamada)
- 500 × 2 → `GeminiRetryError` con `reason: 'Server Error (500)'`
- `isRetryExhausted === true` en `GeminiRetryError`

---

### `lib/ai-evaluator.test.ts` — Evaluador de Respuestas IA

**Módulo:** `lib/ai-evaluator.ts`
**Tipo de test:** Unitario con mock de Gemini
**Justificación del tipo:** `evaluateResponse` tiene dos caminos: evalúa con Gemini (camino feliz) o cae al evaluador léxico local (modo degradado). El test prueba **el modo degradado**, que es el más crítico para la resiliencia de la aplicación. Se mockea `callGeminiWithRetry` para que siempre falle, forzando el fallback. Probar el modo feliz con Gemini real sería un test de integración contra la API de Gemini, que es lento, costoso en cuota y no determinista. El modo degradado se puede probar completamente de forma unitaria porque su lógica (`calculateLexicalMetrics`) es puramente local.

**Propósito:** Verificar que el evaluador nunca rompe el flujo principal cuando Gemini falla (modo degradado con métricas léxicas locales).

**Por qué es necesario:**
- El evaluador de calidad es un componente "decorativo" — si falla, no debe impedir que el usuario reciba su análisis de productividad.
- `combinedScore` debe estar siempre en [0, 100] para no generar datos inválidos en la BD.

**Qué se prueba:**
- No lanza excepción cuando Gemini falla
- Retorna todos los campos requeridos del `EvaluationResult`
- `combinedScore` ∈ [0, 100]
- `lexicalMetrics.wordCount` > 0 para texto con palabras
- `justification` menciona métricas léxicas en modo degradado

---

### `lib/ai-fallbacks.test.ts` — Datos de Fallback Estáticos

**Módulo:** `lib/ai-fallbacks.ts`
**Tipo de test:** Unitario puro
**Justificación del tipo:** `lib/ai-fallbacks.ts` es un módulo de solo datos — exporta constantes y dos funciones que seleccionan un elemento aleatorio de un array. No tiene ninguna dependencia externa. Los tests verifican invariantes estructurales del contrato de datos (longitud mínima de arrays, presencia de campos, tipo de valores) que deben cumplirse en tiempo de compilación/carga. Es el caso más puro posible de test unitario. No tendría sentido plantear integración o E2E para datos estáticos.

**Propósito:** Verificar que los datos estáticos de fallback (cuando Gemini no está disponible) tienen la estructura correcta para ser consumidos por los handlers.

**Por qué es necesario:**
- Si un handler espera `FALLBACK_PATTERNS.patterns` y el array no existe, se produce un 500 en producción.
- Los tips de consejos son el contenido de la app sin conexión — deben ser strings no vacíos.

**Qué se prueba:**
- `FALLBACK_ADVICE_TIPS`: ≥ 30 consejos; todos strings no vacíos; `getRandomAdvice()` ∈ array
- `FALLBACK_PATTERNS`: `source === 'fallback'`; arrays de patterns/correlations/recommendations
- `FALLBACK_SCHEDULE`: primer item tiene time/task/duration/reason; `source === 'fallback'`
- `FALLBACK_MOTIVATIONAL`: ≥ 10 frases; `getRandomMotivational()` ∈ array

---

### `lib/lexical-metrics.test.ts` — Métricas Léxicas

**Módulo:** `lib/ai-evaluator.ts` (función `calculateLexicalMetrics`)
**Tipo de test:** Unitario puro
**Justificación del tipo:** `calculateLexicalMetrics` es una función matemática pura: recibe un string y devuelve un objeto con números. No hay efectos secundarios, no hay dependencias externas. Cada test tiene input conocido y output esperado completamente determinista. Se separa en su propio archivo (en lugar de incluirse en `ai-evaluator.test.ts`) porque cubre un número de casos de borde suficiente para merecer su propia suite, siguiendo el principio de responsabilidad única en testing.

**Propósito:** Verificar los cálculos locales de métricas de texto que se usan cuando Gemini no está disponible como evaluador.

**Por qué es necesario:**
- `lexicalDiversity` se usa como fallback del 100% del `combinedScore`. Si retorna valores fuera de [0,1], el score de calidad sería inválido.
- Texto vacío no debe lanzar excepción (viene de respuestas de Gemini que pueden ser vacías).

**Qué se prueba:**
- `wordCount` correcto para texto conocido
- `lexicalDiversity` ∈ [0, 1]
- Texto vacío → zeros sin excepción
- Detección de verbos (-ar/-er/-ir) y sustantivos (-ción/-dad/-ez)
- Redondeo a 2 decimales
- Una palabra → diversidad = 1

---

### `api/login.test.ts` — Endpoint de Login

**Módulo:** `app/api/auth/login/route.ts`
**Tipo de test:** Unitario con mock de auth y BD
**Justificación del tipo:** El handler de login orquesta varias capas: parseo del body, validación de campos, llamada a `getUserByEmail`, comparación de password y emisión de cookie. Se mockean `getUserByEmail` y `verifyPassword` (las únicas funciones que tocan la BD y bcrypt respectivamente) para controlar exactamente qué responde cada capa en cada escenario. Esto permite probar los 5 caminos del handler (400 faltante, 401 usuario no encontrado, 401 password incorrecta, 200 exitoso, cookie presente) en milisegundos sin una BD real. Un test de integración aquí requeriría un usuario real en Turso con password hasheada, añadiendo dependencia de estado externo que complicaría el mantenimiento.

**Propósito:** Verificar el flujo de autenticación por credenciales.

**Por qué es necesario:**
- Es la puerta de entrada a toda la aplicación. Un fallo en validación puede abrir acceso no autorizado.
- La cookie `auth-token` debe configurarse correctamente (httpOnly) — si no se setea, el usuario nunca podrá autenticarse.

**Qué se prueba:**
- 400 si falta email o password
- 401 si usuario no existe
- 401 si password incorrecta
- 200 + `{ success, user }` en login exitoso
- Cookie `auth-token` presente en respuesta exitosa

---

### `api/register.test.ts` — Endpoint de Registro

**Módulo:** `app/api/auth/register/route.ts`
**Tipo de test:** Unitario con mock de auth y BD
**Justificación del tipo:** El handler de registro tiene la mayor densidad de validaciones de toda la API (campos requeridos, formato de email, longitud de password, unicidad de email). Todas esas validaciones son lógica pura del handler — no dependen del estado de la BD para ejecutarse correctamente. Se mockea `getUserByEmail` para el caso 409 (email duplicado) y `createUser`/`hashPassword`/`createToken` para el caso 200. El test no verifica que el usuario quedó guardado en Turso porque eso es responsabilidad de `createUser`, que tiene su propio contrato. Probar esa integración completa requeriría limpiar la BD entre tests para evitar colisiones de email único.

**Propósito:** Verificar todas las validaciones del registro de nuevos usuarios.

**Por qué es necesario:**
- Datos inválidos que lleguen a la BD (email sin formato, contraseñas débiles) son un riesgo de seguridad y calidad de datos.
- El 409 evita duplicados que romperían el índice UNIQUE de la BD.

**Qué se prueba:**
- 400 si falta email, password o name
- 400 si email tiene formato inválido
- 400 si password < 6 caracteres
- 409 si email ya existe
- 200 + `{ success, token, user }` en registro exitoso
- Cookie `auth-token` presente en respuesta exitosa

---

### `api/tasks.test.ts` — Endpoints de Tareas

**Módulo:** `app/api/tasks/route.ts`
**Tipo de test:** Unitario con mock de auth y capa de datos
**Justificación del tipo:** El handler de tareas depende de `verifyToken` (auth) y `getSecureUserTasks`/`saveSecureTask` (capa de datos con cifrado + BD). Se mockean ambas capas para probar solo la lógica del handler: verificación del token, validación del título y formación de la respuesta HTTP. Los tests de cifrado de tareas ya están cubiertos en `encryption.test.ts` y los tests de la BD en los mocks de `secure-data`. Separar estas responsabilidades evita duplicar aserciones y mantiene cada test enfocado en una sola unidad de comportamiento. Se requiere inyectar manualmente `req.cookies` en el request porque `NextRequest.cookies` es una propiedad de Next.js que no existe en el `Request` estándar del entorno de test.

**Propósito:** Verificar los guards de autenticación y validaciones mínimas del CRUD de tareas.

**Por qué es necesario:**
- Las tareas son el núcleo de la app. Sin guard de auth, cualquier usuario podría leer o crear tareas de otro.
- El campo `title` es requerido para cifrado — sin él, `encryptSensitiveData("")` o `encryptSensitiveData(null)` lanzaría un error.

**Qué se prueba (GET):**
- 401 sin cookie de autenticación
- 401 con token inválido
- 200 + `{ success, tasks }` con token válido

**Qué se prueba (POST):**
- 401 sin cookie de autenticación
- 401 con token inválido
- 400 si falta el título
- 200 al crear tarea con campos mínimos

---

### `api/moods.test.ts` — Endpoints de Estado de Ánimo

**Módulo:** `app/api/moods/route.ts`
**Tipo de test:** Unitario con mock de auth y capa de datos
**Justificación del tipo:** Igual que tasks, se aísla el handler mockeando `readAuthToken`/`verifyToken` (auth) y `saveSecureMood` (datos). El valor añadido de estos tests es validar específicamente el rango `1-5` de `energy` antes de que el dato llegue a la BD — si esa validación no existiera y se guardara un 6, Turso rechazaría el INSERT con el CHECK constraint y el usuario recibiría un 500 genérico en lugar de un 400 descriptivo. Esa lógica de validación vive exclusivamente en el handler y se puede verificar de forma unitaria sin la BD. `getCurrentDateTime` de `@/lib/utils` también se mockea para que los tests que usan la fecha/hora actual sean reproducibles independientemente del momento de ejecución.

**Propósito:** Verificar los guards de autenticación y la validación del rango de `energy` (CHECK constraint en BD).

**Por qué es necesario:**
- `energy` tiene un CHECK constraint `1-5` en la BD. Si se guarda un valor fuera de rango, Turso rechaza el INSERT con un error 500 en producción.
- Sin guard de auth, los datos de bienestar del usuario (información sensible) estarían expuestos.

**Qué se prueba (GET):**
- 401 sin token
- 401 con token inválido
- 200 + `{ success, moods }` con token válido

**Qué se prueba (POST):**
- 401 sin token
- 400 si falta `energy`
- 400 si falta `type`
- 400 si `energy > 5`
- 400 si `energy < 1` (= 0)
- 200 al crear mood con campos mínimos

---

## Infraestructura de tests

### `__tests__/setup.ts`
Configuración global ejecutada antes de cada archivo de test:
- **Mock de BD (`@/lib/db`):** `getDb`, `ensureDbReady`, `getTwoFactorEnabled`, `saveTwoFactorCode`, `createRecurringNextTask` — todos mockeados para evitar llamadas reales a Turso.
- **Variables de entorno:** `JWT_SECRET`, `ENCRYPTION_KEY`, `GEMINI_API_KEY`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` configuradas con valores de prueba válidos.

### `vitest.config.ts`
- Entorno: `happy-dom` (DOM simulado para Next.js App Router)
- Globals activados (`describe`, `it`, `expect`, `vi` sin importar)
- Alias `@/` apuntando a la raíz del proyecto

### Estrategia de mocks
Los tests de librerías puras (`encryption`, `auth-utils`, `ai-cache`, `roles`) usan **la implementación real** — sin mocks de las funciones que se están probando.

Los tests de API **mockean las dependencias externas** (`@/lib/auth`, `@/lib/secure-data`, `@/lib/utils`) para aislar el handler y probar solo su lógica de validación y routing.

---

## Cobertura por área de la aplicación

| Área | Nivel de cobertura | Justificación |
|------|-------------------|---------------|
| Cifrado (seguridad) | Alta | Módulo crítico, datos privados del usuario |
| Auth (JWT, bcrypt) | Alta | Puerta de entrada a toda la app |
| Pipeline IA (Gemini) | Alta | Lógica compleja con reintentos, caché, fallbacks |
| RBAC (roles) | Media | Comportamiento en BD real cubierto; permisos puramente declarativos |
| API endpoints | Media | Guards y validaciones; lógica de negocio en `secure-data` |
| Componentes React | No incluido | Tests de UI requieren un nivel de integración distinto (Playwright/Cypress); la lógica de negocio está en el servidor |
| Integración BD | No incluido | Se prueba con BD real en staging; los tests unitarios usan mock para velocidad y reproductibilidad |
