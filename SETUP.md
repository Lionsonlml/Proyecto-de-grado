# 🚀 Guía de Configuración - Timewize

## ⚡ Inicio Rápido

### 1. Instalar Dependencias

```bash
pnpm install
```

### 2. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copia el archivo de ejemplo
cp .env.example .env.local
```

Edita `.env.local` y configura:

```env
# Tu API Key de Gemini (REQUERIDO)
GEMINI_API_KEY=tu_api_key_real_aqui

# Secret para JWT (puedes usar cualquier string largo y aleatorio)
JWT_SECRET=mi-super-secret-key-muy-segura-12345
```

### 3. Obtener API Key de Gemini

1. Ve a: https://makersuite.google.com/app/apikey
2. Inicia sesión con tu cuenta de Google
3. Crea una nueva API key
4. Copia la key y pégala en `.env.local`

### 4. Iniciar el Servidor

```bash
# Limpiar caché (importante después de cambios)
pnpm run build
# o manualmente: Remove-Item -Recurse -Force .next

# Iniciar servidor de desarrollo
pnpm dev
```

### 5. Acceder a la Aplicación

Abre tu navegador en: http://localhost:3000

## 👥 Usuarios de Prueba

La aplicación viene con 3 usuarios pre-cargados con datos de ejemplo:

### María García (Perfil Matutino)
- **Email**: maria@test.com
- **Password**: password123
- **Características**: Alta productividad en la mañana, energía disminuye en la tarde
- **Datos**: 8 tareas completadas, 7 registros de estado de ánimo

### Juan Pérez (Perfil Vespertino)
- **Email**: juan@test.com
- **Password**: password123
- **Características**: Productividad aumenta en la tarde/noche
- **Datos**: 8 tareas completadas, 7 registros de estado de ánimo

### Admin User
- **Email**: admin@test.com
- **Password**: admin123
- **Características**: Usuario administrativo

## 🤖 Probando Gemini AI

1. Inicia sesión con cualquier usuario de prueba
2. Ve a la página "Gemini Lab" o Dashboard
3. Haz clic en "Analizar con Gemini AI"
4. El sistema:
   - Obtiene los datos reales del usuario de la base de datos
   - Los envía a Gemini API
   - Muestra el análisis generado por IA (SIN FALLBACKS)

**IMPORTANTE**: El análisis es 100% real de Gemini. No hay datos simulados ni respuestas predeterminadas.

## 📊 Base de Datos

- **Tipo**: SQLite (better-sqlite3)
- **Ubicación**: `data/app.db`
- **Inicialización**: Automática al primer arranque
- **Tablas**:
  - `users`: Usuarios de la aplicación
  - `tasks`: Tareas de los usuarios
  - `moods`: Estados de ánimo registrados
  - `gemini_insights`: Historial de análisis de Gemini

## 🔐 Autenticación

- Sistema JWT con cookies httpOnly
- Middleware protege todas las rutas excepto `/login` y `/register`
- Tokens válidos por 7 días
- Contraseñas hasheadas con bcryptjs

## 🛠️ Solución de Problemas

### Error: "Cannot find module 'jose'" o similar

**Solución**: Ejecuta `pnpm install` para instalar todas las dependencias.

### Error: "GEMINI_API_KEY no está configurada"

**Solución**: 
1. Verifica que `.env.local` existe
2. Verifica que `GEMINI_API_KEY` tiene un valor válido
3. Reinicia el servidor después de cambiar variables de entorno

### Error: "models/gemini-1.5-flash is not found"

**Solución**: 
1. Verifica que tu API key es válida
2. Asegúrate de que tienes acceso al modelo gemini-1.5-flash
3. Revisa `lib/gemini-config.ts` para ver la configuración del modelo

### Base de datos no se crea

**Solución**:
1. Verifica que la carpeta `data/` existe: `New-Item -ItemType Directory -Force -Path data`
2. Verifica permisos de escritura en la carpeta
3. Revisa los logs del servidor para errores

### Warnings de viewport metadata

**Solución**: Estos warnings ya están corregidos en `app/layout.tsx`. Si persisten, limpia el caché con:
```bash
Remove-Item -Recurse -Force .next
pnpm dev
```

### No se muestran resultados de Gemini

**Verificar**:
1. Token de autenticación válido (inicia sesión nuevamente)
2. Usuario tiene datos de tareas/moods en la base de datos
3. API key de Gemini es válida
4. Revisa la consola del servidor para errores de API

## 📁 Estructura del Proyecto

```
timegemini-pwa/
├── app/
│   ├── api/
│   │   ├── auth/           # Endpoints de autenticación
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── logout/
│   │   │   └── me/
│   │   └── gemini/         # Endpoints de Gemini AI
│   │       ├── analyze/    # Análisis de patrones
│   │       └── insight/    # Insights personalizados
│   ├── login/              # Página de login
│   ├── register/           # Página de registro
│   ├── dashboard/          # Dashboard principal
│   ├── gemini-lab/         # Laboratorio Gemini
│   └── page.tsx            # Redirige a /login
├── lib/
│   ├── db.ts               # Configuración y seed de DB
│   ├── auth.ts             # Funciones de autenticación
│   ├── gemini-config.ts    # Configuración de Gemini
│   └── gemini-client.ts    # Cliente Gemini (frontend)
├── data/
│   └── app.db              # Base de datos SQLite (auto-generada)
├── middleware.ts           # Protección de rutas
└── .env.local              # Variables de entorno (crear manualmente)
```

## 🔄 Flujo de la Aplicación

1. Usuario accede a `/` → Redirige a `/login`
2. Usuario inicia sesión → Crea token JWT
3. Middleware verifica token en cada request
4. Usuario navega a Dashboard o Gemini Lab
5. Al solicitar análisis:
   - Frontend llama a `/api/gemini/analyze`
   - Backend verifica autenticación
   - Obtiene datos reales del usuario desde DB
   - Envía a Gemini API
   - Guarda resultado en `gemini_insights`
   - Retorna análisis al frontend
6. Usuario ve análisis real de Gemini (NO hay fallbacks)

## ✅ Verificación de Instalación Correcta

Ejecuta estos comandos para verificar:

```bash
# 1. Verificar dependencias instaladas
pnpm list | Select-String "jose|bcryptjs|better-sqlite3"

# 2. Verificar que .env.local existe
Test-Path .env.local

# 3. Verificar carpeta data
Test-Path data

# 4. Limpiar caché y reconstruir
Remove-Item -Recurse -Force .next
pnpm dev
```

## 🎯 Características Implementadas

✅ Sistema de autenticación completo con JWT  
✅ Base de datos SQLite con usuarios de prueba  
✅ Integración real con Gemini API (sin mocks)  
✅ Middleware de protección de rutas  
✅ Páginas de login y registro estilizadas  
✅ Datos de prueba con patrones distintos por usuario  
✅ Historial de insights de Gemini  
✅ PWA funcional para Android  

## 📝 Notas Importantes

- **NO HAY RESPUESTAS SIMULADAS**: Todo análisis viene directamente de Gemini API
- **Datos Reales**: Los usuarios de prueba tienen datos históricos diferentes para mostrar patrones distintos
- **Seguridad**: Las contraseñas están hasheadas, tokens en cookies httpOnly
- **Escalabilidad**: SQLite es perfecto para desarrollo/pruebas, para producción considera PostgreSQL

## 🆘 Soporte

Si encuentras problemas:
1. Revisa esta guía completa
2. Verifica los logs del servidor (`pnpm dev`)
3. Revisa la consola del navegador (F12)
4. Asegúrate de tener la API key correcta de Gemini

---

**¡Listo! Tu aplicación de gestión del tiempo con IA está configurada correctamente.** 🎉
