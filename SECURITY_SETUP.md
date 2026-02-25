# Configuración de Seguridad - TimeWize

## Variables de Entorno Requeridas

Crea un archivo `.env.local` con las siguientes variables:

```bash
# Configuración de la aplicación
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://tu-dominio.com

# Autenticación JWT (OBLIGATORIO - Cambiar en producción)
JWT_SECRET=tu-clave-secreta-jwt-super-segura-de-al-menos-32-caracteres

# Cifrado de datos sensibles (OBLIGATORIO - Cambiar en producción)
ENCRYPTION_KEY=tu-clave-de-cifrado-aes-256-de-al-menos-32-caracteres

# Base de datos
DATABASE_URL=file:./data/app.db

# Gemini AI (opcional)
GEMINI_API_KEY=tu-clave-de-api-de-gemini

# Configuración de cookies
COOKIE_SECRET=tu-clave-secreta-para-cookies

# Configuración de seguridad
SECURE_COOKIES=true
SAME_SITE_COOKIES=strict
```

## Características de Seguridad Implementadas

### 1. Cifrado de Datos Sensibles
- **Algoritmo**: AES-256-GCM
- **Campos cifrados**: Notas de moods, metadatos de insights de IA
- **Clave**: Configurable via `ENCRYPTION_KEY`

### 2. Autenticación Segura
- **JWT**: Tokens firmados con HMAC-SHA256
- **Cookies**: httpOnly, secure, sameSite=strict
- **Contraseñas**: Hasheadas con bcrypt (10 rounds)

### 3. Control de Acceso Basado en Roles
- **Roles**: user, moderator, admin
- **Permisos**: Granular por funcionalidad
- **Auditoría**: Logs de acceso a datos

### 4. Gestión de Privacidad
- **Consentimiento**: Modal interactivo con opciones granulares
- **Preferencias**: Control total del usuario sobre sus datos
- **Exportación**: Descarga completa de datos personales
- **Eliminación**: Borrado seguro y completo

### 5. Protección de Base de Datos
- **Cifrado**: Datos sensibles cifrados en reposo
- **Acceso**: Controlado por roles y permisos
- **Auditoría**: Registro de accesos y modificaciones

## Configuración de Producción

### 1. Generar Claves Seguras

```bash
# Generar JWT_SECRET (32+ caracteres)
openssl rand -base64 32

# Generar ENCRYPTION_KEY (32+ caracteres)
openssl rand -base64 32

# Generar COOKIE_SECRET (32+ caracteres)
openssl rand -base64 32
```

### 2. Configuración de HTTPS
- Usar certificados SSL válidos
- Configurar HSTS headers
- Redirigir HTTP a HTTPS

### 3. Configuración de Cookies
```javascript
// En producción, asegurar:
secure: true,        // Solo HTTPS
sameSite: 'strict',  // Protección CSRF
httpOnly: true,      // No acceso desde JS
```

### 4. Backup de Base de Datos
```bash
# Respaldar base de datos
cp data/app.db data/app.db.backup.$(date +%Y%m%d_%H%M%S)

# Restaurar desde backup
cp data/app.db.backup.YYYYMMDD_HHMMSS data/app.db
```

## Verificación de Seguridad

### 1. Verificar Cifrado
```bash
# Verificar que los datos sensibles están cifrados
sqlite3 data/app.db "SELECT notes FROM moods WHERE notes IS NOT NULL LIMIT 1;"
# Debe mostrar datos cifrados (formato: iv:tag:encrypted)
```

### 2. Verificar Cookies
```bash
# En DevTools > Application > Cookies
# Verificar que auth-token tiene:
# - httpOnly: true
# - secure: true (en HTTPS)
# - sameSite: strict
```

### 3. Verificar Roles
```bash
# Verificar roles de usuario
sqlite3 data/app.db "SELECT u.email, ur.role FROM users u JOIN user_roles ur ON u.id = ur.user_id;"
```

## Monitoreo y Auditoría

### 1. Logs de Acceso
```sql
-- Ver accesos recientes
SELECT * FROM data_access_logs ORDER BY accessed_at DESC LIMIT 10;

-- Ver accesos por usuario
SELECT * FROM data_access_logs WHERE user_id = ? ORDER BY accessed_at DESC;
```

### 2. Consentimientos
```sql
-- Ver historial de consentimientos
SELECT * FROM consents ORDER BY accepted_at DESC;

-- Ver preferencias de usuario
SELECT * FROM user_preferences;
```

## Incidentes de Seguridad

### 1. Compromiso de Claves
1. Cambiar inmediatamente `JWT_SECRET` y `ENCRYPTION_KEY`
2. Invalidar todas las sesiones (logout masivo)
3. Revisar logs de acceso
4. Notificar a usuarios afectados

### 2. Acceso No Autorizado
1. Revisar logs de `data_access_logs`
2. Identificar patrones sospechosos
3. Bloquear IPs si es necesario
4. Cambiar contraseñas afectadas

### 3. Fuga de Datos
1. Identificar alcance del incidente
2. Notificar a usuarios afectados
3. Cambiar claves de cifrado
4. Implementar medidas adicionales

## Contacto de Seguridad

Para reportar vulnerabilidades de seguridad:
- Email: security@timewize.app
- Proceso: Coordinación responsable de divulgación
- Tiempo de respuesta: 24-48 horas

## Actualizaciones de Seguridad

- Revisar y actualizar dependencias regularmente
- Monitorear CVE y advisories
- Implementar parches de seguridad
- Realizar auditorías periódicas
