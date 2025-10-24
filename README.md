# Timewize - Gestión Inteligente del Tiempo con IA

Una Progressive Web App (PWA) para Android que optimiza la gestión del tiempo utilizando **Google Gemini AI** para análisis inteligente de productividad.

## 🚀 Características

- **Análisis de IA con Gemini**: Detecta patrones de productividad y proporciona recomendaciones personalizadas
- **Gestión de Tareas**: Organiza y prioriza tus tareas diarias
- **Seguimiento de Estados de Ánimo**: Correlaciona tu energía con tu eficiencia
- **Horarios Optimizados**: Genera horarios basados en tus patrones de productividad
- **PWA**: Instalable en Android como aplicación nativa
- **Modo Offline**: Funciona sin conexión a internet
- **Dashboard Interactivo**: Visualiza tu productividad en tiempo real

## 📋 Requisitos Previos

- Node.js 18+ o superior
- pnpm (gestor de paquetes)
- *(Opcional)* Una API Key de Google Gemini para análisis con IA real

## 🎭 Modos de Funcionamiento

### Modo Demo (Por Defecto)
La aplicación funciona **sin necesidad de configurar nada** con análisis simulados basados en tus datos reales. Perfecto para:
- ✅ Probar la aplicación
- ✅ Ver análisis básicos de productividad
- ✅ Explorar todas las funcionalidades

### Modo IA Real (Opcional)
Configura una API Key de Gemini para obtener:
- 🚀 Análisis avanzados con Machine Learning
- 🎯 Recomendaciones personalizadas por IA
- 📊 Insights contextuales profundos

**Ver:** [GEMINI_SETUP.md](./GEMINI_SETUP.md) para instrucciones detalladas de configuración.

## 🛠️ Instalación

1. **Instalar dependencias**
   ```bash
   pnpm install
   ```

2. **Iniciar el servidor de desarrollo**
   ```bash
   pnpm dev
   ```

3. **Abrir en el navegador**
   
   Navega a [http://localhost:3000](http://localhost:3000)
   
   Serás redirigido a `/login`. Usa uno de los usuarios de prueba:
   - **maria@test.com** / password123 (perfil matutino)
   - **juan@test.com** / password123 (perfil vespertino)
   - **admin@test.com** / admin123

> **Nota:** La aplicación ya está completamente funcional en modo demo. Para habilitar análisis con IA real, consulta [GEMINI_SETUP.md](./GEMINI_SETUP.md)

## 🔐 Sistema de Autenticación

La aplicación incluye un sistema completo de autenticación:

- **JWT con cookies httpOnly** para seguridad
- **Base de datos SQLite** con @libsql/client
- **Contraseñas hasheadas** con bcryptjs
- **Middleware** que protege todas las rutas
- **Usuarios de prueba** pre-cargados con datos
- **Persistencia local** - Los datos se guardan en `data/app.db`

### Usuarios de Prueba

Cada usuario tiene datos distintos para demostrar cómo Gemini analiza diferentes patrones:

**María García** (maria@test.com / password123)
- Perfil: Alta productividad matutina
- 8 tareas completadas en horarios AM
- Estados de ánimo: energético en la mañana, cansado en la tarde

**Juan Pérez** (juan@test.com / password123)
- Perfil: Alta productividad vespertina
- 8 tareas completadas en horarios PM
- Estados de ánimo: lento en la mañana, peak en la tarde

**Admin** (admin@test.com / admin123)
- Usuario administrativo

## 📱 Instalación como PWA en Android

1. Abre la aplicación en Chrome para Android
2. Toca el menú (⋮) y selecciona "Agregar a pantalla de inicio"
3. La aplicación se instalará como una app nativa

## 🏗️ Estructura del Proyecto

```
timegemini-pwa/
├── app/
│   ├── api/
│   │   └── gemini/          # Rutas API para Gemini
│   │       ├── analyze/     # Análisis de patrones
│   │       └── insight/     # Insights personalizados
│   ├── dashboard/           # Panel principal
│   ├── gemini-lab/          # Laboratorio de pruebas Gemini
│   ├── tasks/               # Gestión de tareas
│   ├── moods/               # Seguimiento de estados de ánimo
│   └── schedule/            # Horarios optimizados
├── components/
│   ├── ui/                  # Componentes de UI (shadcn)
│   ├── gemini-demo.tsx      # Demo de integración Gemini
│   └── ...
├── lib/
│   ├── gemini-client.ts     # Cliente API de Gemini (frontend)
│   ├── gemini-config.ts     # Configuración de Gemini (backend)
│   └── storage.ts           # Almacenamiento local
└── public/
    ├── icons/               # Iconos de la PWA
    ├── manifest.json        # Manifiesto PWA
    └── sw.js                # Service Worker
```

## 🤖 Integración con Gemini AI

La aplicación utiliza Google Gemini 1.5 Flash para:

1. **Análisis de Patrones**: Detecta horarios óptimos y correlaciones entre estados de ánimo y productividad
2. **Recomendaciones Personalizadas**: Sugiere mejoras basadas en tu historial
3. **Generación de Horarios**: Crea horarios optimizados según tus patrones de energía

### Modo Demo Inteligente

Sin configurar la API key, la aplicación genera análisis automáticos basados en:
- Tasa de finalización de tareas
- Niveles promedio de energía
- Horarios con mayor productividad
- Recomendaciones contextuales personalizadas

### Ejemplo de Uso

```typescript
// El sistema detecta automáticamente si hay API key configurada
// y usa el modo apropiado (Demo o IA Real)

const response = await fetch('/api/gemini/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    analysisType: 'patterns'
  })
})

const result = await response.json()
// result.demo será true si está en modo demo
```

## 🔧 Configuración de Gemini

El archivo `lib/gemini-config.ts` contiene la configuración del modelo:

- **Modelo**: `gemini-1.5-flash`
- **API Version**: `v1beta`
- **Temperature**: 0.7 (equilibrio entre creatividad y precisión)
- **Max Tokens**: 1024

## 📦 Scripts Disponibles

- `pnpm dev` - Inicia el servidor de desarrollo
- `pnpm build` - Construye la aplicación para producción
- `pnpm start` - Inicia el servidor de producción
- `pnpm lint` - Ejecuta el linter

## 🛡️ Configuración de Seguridad

La aplicación implementa:
- Safety Settings de Gemini para contenido apropiado
- API Key solo en el servidor (nunca expuesta al cliente)
- CORS y validación de requests
- Content Security Policy

## 🚀 Despliegue

### Vercel (Recomendado)

1. Instala Vercel CLI:
   ```bash
   pnpm install -g vercel
   ```

2. Despliega:
   ```bash
   vercel
   ```

3. Configura la variable de entorno `GEMINI_API_KEY` en Vercel Dashboard

### Otros Proveedores

La aplicación es compatible con cualquier proveedor que soporte Next.js 15:
- Netlify
- Railway
- DigitalOcean App Platform

## 🐛 Solución de Problemas

### La aplicación muestra análisis "Demo"

**Esto es normal**: La aplicación funciona en modo demo por defecto. Si deseas análisis con IA real, consulta [GEMINI_SETUP.md](./GEMINI_SETUP.md)

### Error al iniciar el servidor

**Solución**: 
1. Asegúrate de tener Node.js 18+ instalado
2. Elimina `node_modules` y `pnpm-lock.yaml`
3. Ejecuta `pnpm install` nuevamente

### La base de datos no se crea

**Solución**: La base de datos se crea automáticamente en `data/app.db` al iniciar el servidor. Si hay problemas, verifica los permisos de escritura en el directorio.

### Error: "Invalid API Key" (solo en modo IA)

**Solución**: 
1. Verifica que tu API key de Gemini sea válida
2. Regenera la clave en [Google AI Studio](https://makersuite.google.com/app/apikey)
3. Actualiza `.env.local` y reinicia el servidor

## 🔄 Actualizaciones Recientes

### Octubre 2025
- ✅ **Modo Demo Inteligente**: La aplicación funciona sin necesidad de API key
- ✅ **Migración a @libsql/client**: Reemplazo de better-sqlite3 para mejor compatibilidad en Windows
- ✅ **Sistema de autenticación completo**: Login, registro y protección de rutas
- ✅ **Base de datos con usuarios de prueba**: Datos pre-cargados para explorar la app
- ✅ **Análisis automáticos contextuales**: El modo demo genera análisis basados en datos reales
- ✅ **Documentación exhaustiva**: Guías separadas para setup básico y avanzado con IA

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Si tienes problemas o preguntas:
- Abre un issue en GitHub
- Consulta la documentación de [Next.js](https://nextjs.org/docs)
- Revisa la documentación de [Gemini API](https://ai.google.dev/gemini-api/docs)

---

Hecho con ❤️ usando Next.js, Gemini AI, y Tailwind CSS
