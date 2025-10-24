# 🤖 Configuración de Gemini AI

La aplicación TimeGemini PWA funciona en dos modos:

## 🎭 Modo Demo (Actual)

Sin configurar la API key de Gemini, la aplicación funciona en **modo demo** con análisis simulados basados en tus datos reales. Esto te permite:

- ✅ Probar todas las funcionalidades de la aplicación
- ✅ Ver análisis básicos de tus patrones de productividad
- ✅ Explorar la interfaz sin necesidad de registro en servicios externos

## 🚀 Modo IA Real (Opcional)

Para obtener análisis avanzados generados por Gemini AI de Google:

### 1. Obtener una API Key de Gemini

1. Ve a [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Inicia sesión con tu cuenta de Google
3. Haz clic en "Crear clave de API"
4. Copia la clave generada

### 2. Configurar la API Key en tu proyecto

Edita el archivo `.env.local` en la raíz del proyecto:

```bash
# Reemplaza el valor con tu API key real
GEMINI_API_KEY=tu-api-key-real-aqui

# Las demás variables pueden quedarse igual
JWT_SECRET=tu-super-secreto-jwt-cambialo-en-produccion-12345
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Reiniciar el servidor

```bash
# Detén el servidor actual (Ctrl+C)
# Luego reinicia:
pnpm dev
```

## 💰 Costos y Límites

- ✅ **Gemini 1.5 Flash** tiene un nivel gratuito generoso
- ✅ Límite gratuito: 15 solicitudes por minuto
- ✅ Suficiente para uso personal y pruebas
- ℹ️ Para más información: [Precios de Gemini API](https://ai.google.dev/pricing)

## 🔍 Diferencias entre Modo Demo y Modo IA

| Característica | Modo Demo | Modo IA Real |
|---------------|-----------|--------------|
| Análisis de patrones | ✅ Básico | 🚀 Avanzado con ML |
| Recomendaciones | ✅ Genéricas | 🎯 Personalizadas |
| Horarios optimizados | ✅ Plantillas | 📊 Basados en tus datos |
| Insights contextuales | ✅ Simulados | 🧠 Generados por IA |
| Costo | ✅ Gratis | ✅ Gratis (con límites) |

## ❓ Preguntas Frecuentes

### ¿Es necesario configurar la API key para usar la app?

No, la aplicación funciona perfectamente en modo demo sin necesidad de configurar nada.

### ¿Es seguro usar mi API key?

Sí, la API key se almacena en `.env.local` que no se sube al repositorio (está en `.gitignore`). Solo se usa en el servidor, nunca se expone al cliente.

### ¿Puedo cambiar entre modo demo y modo IA?

Sí, simplemente agrega o quita la API key del archivo `.env.local` y reinicia el servidor.

### ¿Qué pasa si se acaban mis créditos gratuitos?

La aplicación volverá automáticamente al modo demo hasta que se restablezcan tus límites (mensualmente) o actualices a un plan de pago.

## 🛠️ Solución de Problemas

### Error: "GEMINI_API_KEY no está configurada"

- Verifica que el archivo `.env.local` exista en la raíz del proyecto
- Asegúrate de que la línea `GEMINI_API_KEY=...` esté sin espacios
- Reinicia el servidor después de hacer cambios

### Error: "Invalid API Key"

- Verifica que hayas copiado la clave completa
- Asegúrate de estar usando una clave de Gemini, no de otra API
- Genera una nueva clave si la actual expiró

### Los análisis siguen siendo "demo" después de configurar

- Reinicia completamente el servidor (Ctrl+C y `pnpm dev`)
- Verifica que no haya espacios extra en el archivo `.env.local`
- Comprueba los logs del servidor para ver mensajes de error

---

¿Necesitas ayuda? Revisa la [documentación oficial de Gemini API](https://ai.google.dev/docs)

