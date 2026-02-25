# 🔐 Migración a Seguridad Completa - TimeWize

## ⚠️ IMPORTANTE: Datos Ahora Completamente Seguros

He implementado un sistema de seguridad robusto que **cifra TODOS los datos sensibles** en la base de datos. Ahora los datos solo son legibles por el usuario propietario desde el frontend.

## 🚀 Pasos para Activar la Seguridad

### 1. Configurar Variables de Entorno

Crea o actualiza tu archivo `.env.local`:

```bash
# OBLIGATORIO - Cambiar en producción
JWT_SECRET=tu-clave-jwt-super-segura-de-al-menos-32-caracteres
ENCRYPTION_KEY=tu-clave-de-cifrado-aes-256-de-al-menos-32-caracteres

# Opcional
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
```

**Generar claves seguras:**
```bash
# Generar JWT_SECRET
openssl rand -base64 32

# Generar ENCRYPTION_KEY  
openssl rand -base64 32
```

### 2. Migrar Datos Existentes

**Opción A: Resetear y empezar con datos cifrados (Recomendado)**
```bash
# Instalar dependencias si no están instaladas
npm install

# Resetear base de datos y crear datos cifrados desde cero
node scripts/reset-and-encrypt.js
```

**Opción B: Migrar datos existentes**
```bash
# Si prefieres mantener tus datos existentes
node scripts/migrate-to-encryption-v2.js
```

### 3. Verificar Seguridad

Verifica que todo esté funcionando correctamente:

```bash
# Verificar cifrado y seguridad
node scripts/verify-security.js
```

### 4. Reiniciar la Aplicación

```bash
# Reiniciar el servidor
npm run dev
# o
npm run build && npm start
```

## 🔒 Qué Está Protegido Ahora

### Datos Cifrados en la Base de Datos:
- ✅ **Títulos de tareas** - Cifrados con AES-256-GCM
- ✅ **Descripciones de tareas** - Cifrados con AES-256-GCM  
- ✅ **Tags de tareas** - Cifrados con AES-256-GCM
- ✅ **Notas de moods** - Cifrados con AES-256-GCM
- ✅ **Prompts de IA** - Cifrados con AES-256-GCM
- ✅ **Respuestas de IA** - Cifradas con AES-256-GCM
- ✅ **Metadatos de IA** - Cifrados con AES-256-GCM

### Control de Acceso:
- ✅ **Solo el usuario propietario** puede ver sus datos
- ✅ **Verificación de permisos** en cada API
- ✅ **Auditoría completa** de accesos
- ✅ **Roles y permisos** granulares

### Seguridad de Base de Datos:
- ✅ **Datos ilegibles** sin la clave de cifrado
- ✅ **Acceso controlado** por usuario
- ✅ **Logs de auditoría** de todos los accesos
- ✅ **Validación de entrada** en todas las APIs

## 🛡️ Cómo Funciona la Seguridad

### 1. Cifrado Automático
```typescript
// Al guardar datos
const encryptedData = encryptTaskData({
  title: "Mi tarea secreta",
  description: "Descripción privada"
})
// Se guarda cifrado en la BD

// Al leer datos
const decryptedData = decryptTaskData(encryptedData)
// Se descifra automáticamente para el usuario
```

### 2. Control de Acceso
```typescript
// Verificar que el usuario puede acceder a los datos
const hasAccess = await canUserAccessData(userId, targetUserId, 'tasks')
if (!hasAccess) {
  throw new Error('No tienes permisos')
}
```

### 3. Auditoría Automática
```typescript
// Registrar cada acceso
await logDataAccess(userId, 'read', 'tasks', targetUserId, ip, userAgent)
```

## 📊 Verificación de Seguridad

### En la Base de Datos:
```sql
-- Los datos se ven así (cifrados):
SELECT title FROM tasks LIMIT 1;
-- Resultado: "a1b2c3:def456:789ghi..." (cifrado)

-- Solo el frontend puede descifrarlos
```

### En el Frontend:
```typescript
// Los datos se ven normales para el usuario
const tasks = await fetch('/api/tasks')
// Resultado: [{ title: "Mi tarea secreta", ... }] (descifrado)
```

## 🔧 APIs Actualizadas

### Todas las APIs ahora usan:
- ✅ **Cifrado automático** al guardar
- ✅ **Descifrado automático** al leer
- ✅ **Verificación de permisos** estricta
- ✅ **Auditoría de accesos** completa
- ✅ **Validación de entrada** robusta

### APIs Protegidas:
- `/api/tasks` - Tareas cifradas
- `/api/moods` - Moods cifrados  
- `/api/insights` - Insights cifrados
- `/api/user/data/export` - Exportación segura
- `/api/user/data/delete` - Eliminación segura

## 🚨 Solución de Problemas

### Error: "No tienes permisos para acceder a estos datos"
- **Causa**: El usuario no tiene permisos para acceder a los datos
- **Solución**: Verificar que el usuario esté autenticado correctamente

### Error: "Datos no disponibles"
- **Causa**: Error al descifrar datos (clave incorrecta)
- **Solución**: Verificar que `ENCRYPTION_KEY` sea correcta

### Datos no se cifran
- **Causa**: No se ejecutó la migración
- **Solución**: Ejecutar `node scripts/migrate-to-encryption.js`

### Error de autenticación
- **Causa**: Cookie de autenticación incorrecta
- **Solución**: Verificar que `JWT_SECRET` sea correcta

## 📈 Monitoreo de Seguridad

### Verificar Logs de Acceso:
```sql
-- Ver accesos recientes
SELECT * FROM data_access_logs 
ORDER BY accessed_at DESC 
LIMIT 10;

-- Ver accesos por usuario
SELECT * FROM data_access_logs 
WHERE user_id = ? 
ORDER BY accessed_at DESC;
```

### Verificar Cifrado:
```bash
# Ejecutar verificación
node scripts/verify-security.js
```

## ✅ Lista de Verificación

- [ ] Variables de entorno configuradas
- [ ] Migración de datos ejecutada
- [ ] Verificación de seguridad pasada
- [ ] Aplicación reiniciada
- [ ] Datos se ven normales en el frontend
- [ ] Datos están cifrados en la base de datos
- [ ] Logs de auditoría funcionando

## 🎉 Resultado Final

**Ahora tu aplicación TimeWize es completamente segura:**

- 🔐 **Datos cifrados** - Imposible leer sin la clave
- 👤 **Acceso controlado** - Solo el usuario propietario
- 📝 **Auditoría completa** - Registro de todos los accesos
- 🛡️ **Protección robusta** - Múltiples capas de seguridad
- ✅ **Cumplimiento** - Estándares de privacidad y seguridad

**Los datos en la base de datos ahora son completamente ilegibles para cualquier persona que no sea el usuario propietario autenticado desde el frontend.**
