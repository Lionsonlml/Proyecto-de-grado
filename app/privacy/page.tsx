import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, Eye, Brain, Share2, Lock, Database, UserCheck, AlertTriangle } from 'lucide-react'

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Shield className="h-16 w-16 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold">Política de Privacidad</h1>
          <p className="text-xl text-muted-foreground">
            TimeWize - Protección de Datos y Privacidad
          </p>
          <Badge variant="outline" className="text-sm">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="h-5 w-5" />
              <span>1. Información que Recopilamos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Datos Personales:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Nombre y dirección de correo electrónico</li>
                <li>Información de cuenta y preferencias de usuario</li>
                <li>Datos de autenticación (contraseñas hasheadas)</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Datos de Uso:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Tareas, horarios y categorías de actividades</li>
                <li>Estados de ánimo y notas personales (opcional)</li>
                <li>Patrones de productividad y uso de la aplicación</li>
                <li>Interacciones con funcionalidades de IA</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Datos Técnicos:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Dirección IP y información del navegador</li>
                <li>Cookies y tecnologías de seguimiento</li>
                <li>Logs de acceso y errores del sistema</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5" />
              <span>2. Cómo Utilizamos tus Datos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-700">Funcionalidades Principales:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Gestión de tareas y horarios</li>
                  <li>Análisis de patrones de productividad</li>
                  <li>Recomendaciones personalizadas</li>
                  <li>Sincronización entre dispositivos</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-700">Mejoras del Servicio:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Análisis con Inteligencia Artificial</li>
                  <li>Optimización de algoritmos</li>
                  <li>Desarrollo de nuevas funcionalidades</li>
                  <li>Estadísticas agregadas y anónimas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share2 className="h-5 w-5" />
              <span>3. Compartir Información</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 p-4 rounded-lg mb-4">
              <p className="text-green-800 font-medium">
                <strong>No vendemos ni compartimos tus datos personales con terceros.</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-2">Excepciones limitadas:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Proveedores de servicios técnicos (bajo acuerdos de confidencialidad)</li>
                  <li>Cumplimiento de obligaciones legales</li>
                  <li>Protección de derechos y seguridad</li>
                  <li>Datos agregados y anónimos para investigación</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <span>4. Seguridad y Protección</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-green-700">Medidas de Seguridad:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Cifrado AES-256 para datos sensibles</li>
                  <li>Contraseñas hasheadas con bcrypt</li>
                  <li>Cookies seguras (httpOnly, secure, sameSite)</li>
                  <li>Autenticación JWT con expiración</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold text-blue-700">Protección de Datos:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acceso basado en roles y permisos</li>
                  <li>Auditoría de accesos y cambios</li>
                  <li>Respaldo seguro de información</li>
                  <li>Eliminación segura de datos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>5. Tus Derechos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Acceso y Control:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Ver y descargar todos tus datos</li>
                  <li>Modificar preferencias de privacidad</li>
                  <li>Revocar consentimientos</li>
                  <li>Eliminar tu cuenta y datos</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Transparencia:</h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Historial de consentimientos</li>
                  <li>Información sobre uso de datos</li>
                  <li>Notificaciones de cambios</li>
                  <li>Contacto para consultas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>6. Retención de Datos</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Conservamos tus datos mientras tu cuenta esté activa y según sea necesario para 
                proporcionar nuestros servicios. Puedes solicitar la eliminación en cualquier momento.
              </p>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="text-yellow-800 font-medium">Importante:</p>
                    <p className="text-yellow-700 text-sm">
                      La eliminación de datos es irreversible. Asegúrate de exportar 
                      cualquier información importante antes de proceder.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>7. Contacto y Soporte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Para cualquier consulta sobre privacidad, solicitudes de datos o problemas de seguridad:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Email: privacy@timewize.app</li>
                <li>Formulario de contacto en la aplicación</li>
                <li>Centro de ayuda y documentación</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground pt-8 border-t">
          <p>
            Esta política de privacidad forma parte de nuestros términos de servicio. 
            Al usar TimeWize, aceptas esta política y nuestros términos.
          </p>
        </div>
      </div>
    </div>
  )
}
