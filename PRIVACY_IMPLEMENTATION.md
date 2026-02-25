# Implementación de Privacidad y Seguridad - TimeWize

## ✅ Funcionalidades Implementadas

### 1. Consentimiento Informado Interactivo
- **Modal de consentimiento** (`components/consent-modal.tsx`)
- **Opciones granulares**: Recopilación, IA, compartir, marketing, analytics
- **Guardado en BD**: Tabla `user_preferences` y `consents`
- **Integración**: `components/privacy-guard.tsx` para mostrar automáticamente

### 2. Gestión Manual de Datos del Usuario
- **Exportación completa**: `/api/user/data/export` - Descarga JSON con todos los datos
- **Eliminación segura**: `/api/user/data/delete` - Borrado completo con confirmación
- **Interfaz de usuario**: `components/data-management.tsx` con confirmaciones
- **Datos incluidos**: Tareas, moods, insights, preferencias, consentimientos

### 3. Cifrado y Protección de Base de Datos
- **Cifrado AES-256-GCM**: `lib/encryption.ts` para datos sensibles
- **Campos cifrados**: Notas de moods, metadatos de insights
- **Clave configurable**: Variable `ENCRYPTION_KEY`
- **Funciones**: `encryptSensitiveData()`, `decryptSensitiveData()`

### 4. Cookies Seguras y Controladas
- **JWT mejorado**: httpOnly, secure, sameSite=strict
- **Configuración**: Actualizada en login/logout
- **Expiración**: 7 días con renovación automática
- **Limpieza**: Eliminación segura al logout

### 5. Registro de Consentimiento y Auditoría
- **Tabla `consents`**: Historial completo de consentimientos
- **Tabla `data_access_logs`**: Auditoría de accesos a datos
- **Versiones**: Control de versiones de políticas
- **IP y User-Agent**: Registro de contexto de consentimiento

### 6. Política de Privacidad Clara
- **Página completa**: `/privacy` con información detallada
- **Secciones**: Qué recopilamos, cómo usamos, con quién compartimos
- **Derechos del usuario**: Acceso, modificación, eliminación
- **Contacto**: Información para consultas de privacidad

### 7. Control de Roles y Acceso
- **Sistema de roles**: `lib/roles.ts` con permisos granulares
- **Roles**: user, moderator, admin
- **Permisos**: Ver usuarios, modificar datos, analytics, sistema
- **Middleware**: Verificación de permisos en APIs

## 🗄️ Estructura de Base de Datos

### Tablas Nuevas Creadas:

```sql
-- Preferencias de usuario
CREATE TABLE user_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  data_collection BOOLEAN DEFAULT FALSE,
  ai_analysis BOOLEAN DEFAULT FALSE,
  data_sharing BOOLEAN DEFAULT FALSE,
  marketing_emails BOOLEAN DEFAULT FALSE,
  analytics_tracking BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Historial de consentimientos
CREATE TABLE consents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  scope TEXT NOT NULL,
  accepted BOOLEAN NOT NULL,
  version TEXT NOT NULL,
  accepted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Roles de usuario
CREATE TABLE user_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Logs de acceso a datos
CREATE TABLE data_access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  data_type TEXT NOT NULL,
  target_user_id INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🔐 Seguridad Implementada

### Cifrado de Datos:
- **Notas de moods**: Cifradas con AES-256-GCM
- **Metadatos de insights**: Cifrados con AES-256-GCM
- **Claves**: Generadas desde `ENCRYPTION_KEY`
- **Verificación**: Función `isEncrypted()` para detectar datos cifrados

### Autenticación:
- **JWT**: Tokens firmados con HMAC-SHA256
- **Cookies**: httpOnly, secure, sameSite=strict
- **Contraseñas**: bcrypt con 10 rounds
- **Expiración**: 7 días con renovación

### Control de Acceso:
- **Roles**: Sistema granular de permisos
- **Auditoría**: Logs de todos los accesos
- **Middleware**: Verificación automática de permisos
- **Aislamiento**: Usuarios solo acceden a sus datos

## 📁 Archivos Creados/Modificados

### Nuevos Archivos:
- `lib/encryption.ts` - Utilidades de cifrado AES
- `lib/privacy.ts` - Gestión de privacidad y consentimientos
- `lib/roles.ts` - Sistema de roles y permisos
- `components/consent-modal.tsx` - Modal de consentimiento
- `components/data-management.tsx` - Gestión de datos del usuario
- `components/privacy-guard.tsx` - Guard de privacidad
- `app/privacy/page.tsx` - Página de política de privacidad
- `app/api/user/data/export/route.ts` - API de exportación
- `app/api/user/data/delete/route.ts` - API de eliminación
- `app/api/user/preferences/route.ts` - API de preferencias
- `SECURITY_SETUP.md` - Documentación de seguridad

### Archivos Modificados:
- `lib/db.ts` - Nuevas tablas y índices
- `lib/auth.ts` - Integración de cifrado en funciones existentes
- `app/api/auth/login/route.ts` - Cookies seguras
- `app/api/auth/logout/route.ts` - Limpieza segura de cookies

## 🚀 Cómo Usar

### 1. Configurar Variables de Entorno:
```bash
# Crear .env.local
JWT_SECRET=tu-clave-jwt-super-segura
ENCRYPTION_KEY=tu-clave-de-cifrado-aes-256
```

### 2. Integrar en la Aplicación:
```tsx
// En tu layout principal
import { PrivacyGuard } from '@/components/privacy-guard'

<PrivacyGuard userId={user.id}>
  {/* Tu aplicación */}
</PrivacyGuard>
```

### 3. Usar Gestión de Datos:
```tsx
// En página de perfil
import { DataManagement } from '@/components/data-management'

<DataManagement userId={user.id} />
```

### 4. Verificar Seguridad:
```bash
# Verificar datos cifrados
sqlite3 data/app.db "SELECT notes FROM moods WHERE notes IS NOT NULL LIMIT 1;"

# Verificar roles
sqlite3 data/app.db "SELECT * FROM user_roles;"
```

## ✅ Cumplimiento de Requisitos

- ✅ **Consentimiento informado interactivo** - Modal con opciones granulares
- ✅ **Gestión manual de datos** - Exportar/eliminar con confirmación
- ✅ **Cifrado de base de datos** - AES-256 para datos sensibles
- ✅ **Cookies seguras** - httpOnly, secure, sameSite=strict
- ✅ **Registro de consentimiento** - Tabla de auditoría completa
- ✅ **Política de privacidad** - Página detallada y accesible
- ✅ **Control de roles** - Sistema granular de permisos
- ✅ **Auditoría de accesos** - Logs de todas las operaciones

## 🔒 Datos Protegidos

Los siguientes datos están cifrados en la base de datos:
- **Notas personales** en estados de ánimo
- **Metadatos sensibles** en insights de IA
- **Información de contexto** en análisis

Los datos solo se descifran cuando:
- El usuario autenticado accede a sus propios datos
- Se cumple con las preferencias de privacidad
- Se registra el acceso en logs de auditoría

## 📞 Soporte

Para consultas sobre privacidad o seguridad:
- Revisar `SECURITY_SETUP.md` para configuración
- Verificar logs en `data_access_logs`
- Contactar: privacy@timewize.app
