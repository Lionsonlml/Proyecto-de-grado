'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Download, 
  Trash2, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Database,
  Eye,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DataManagementProps {
  userId: number
}

export function DataManagement({ userId }: DataManagementProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const { toast } = useToast()

  const handleExportData = async () => {
    try {
      setIsExporting(true)
      
      const response = await fetch('/api/user/data/export', {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Error al exportar datos')
      }

      // Crear y descargar archivo
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `timewize-data-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Datos exportados",
        description: "Tu información ha sido descargada exitosamente.",
      })
    } catch (error) {
      console.error('Error exportando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron exportar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleDeleteAllData = async () => {
    if (deleteConfirmText !== 'DELETE_ALL_MY_DATA') {
      toast({
        title: "Confirmación incorrecta",
        description: "Debes escribir exactamente 'DELETE_ALL_MY_DATA' para confirmar.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsDeleting(true)
      
      const response = await fetch('/api/user/data/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          confirm: deleteConfirmText,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al eliminar datos')
      }

      toast({
        title: "Datos eliminados",
        description: "Todos tus datos han sido eliminados. Serás redirigido al login.",
      })

      // Redirigir al login después de un breve delay
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
    } catch (error) {
      console.error('Error eliminando datos:', error)
      toast({
        title: "Error",
        description: "No se pudieron eliminar los datos. Inténtalo de nuevo.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText('')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Gestión de Datos Personales</span>
          </CardTitle>
          <CardDescription>
            Controla y gestiona todos tus datos personales en TimeWize
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Exportar Datos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Download className="h-4 w-4" />
                  <span>Exportar Mis Datos</span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  Descarga una copia completa de todos tus datos en formato JSON
                </p>
              </div>
              <Button 
                onClick={handleExportData} 
                disabled={isExporting}
                variant="outline"
              >
                {isExporting ? 'Exportando...' : 'Descargar Datos'}
              </Button>
            </div>
            
            <Alert>
              <Eye className="h-4 w-4" />
              <AlertDescription>
                El archivo incluirá: tareas, estados de ánimo, insights de IA, preferencias y historial de consentimientos.
              </AlertDescription>
            </Alert>
          </div>

          {/* Eliminar Datos */}
          <div className="space-y-4 border-t pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold flex items-center space-x-2 text-red-600">
                    <Trash2 className="h-4 w-4" />
                    <span>Eliminar Todos Mis Datos</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Elimina permanentemente tu cuenta y todos los datos asociados
                  </p>
                </div>
                <Button 
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                >
                  Eliminar Datos
                </Button>
              </div>

              {showDeleteConfirm && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>¡ADVERTENCIA!</strong> Esta acción es irreversible. 
                          Se eliminarán permanentemente:
                        </AlertDescription>
                      </Alert>
                      
                      <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                        <li>Todas tus tareas y horarios</li>
                        <li>Estados de ánimo y notas personales</li>
                        <li>Insights y análisis de IA</li>
                        <li>Preferencias y configuraciones</li>
                        <li>Historial de consentimientos</li>
                        <li>Tu cuenta de usuario</li>
                      </ul>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">
                          Para confirmar, escribe exactamente: <code className="bg-gray-100 px-1 rounded">DELETE_ALL_MY_DATA</code>
                        </label>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full p-2 border rounded-md"
                          placeholder="DELETE_ALL_MY_DATA"
                        />
                      </div>

                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleDeleteAllData}
                          disabled={isDeleting || deleteConfirmText !== 'DELETE_ALL_MY_DATA'}
                          variant="destructive"
                          className="flex-1"
                        >
                          {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                        </Button>
                        <Button 
                          onClick={() => {
                            setShowDeleteConfirm(false)
                            setDeleteConfirmText('')
                          }}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Información de Seguridad */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Protección de Datos</span>
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium text-green-700">Medidas de Seguridad:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Datos sensibles cifrados con AES-256</li>
                  <li>Contraseñas hasheadas con bcrypt</li>
                  <li>Cookies seguras (httpOnly, secure)</li>
                  <li>Acceso basado en roles</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700">Tus Derechos:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Acceso a todos tus datos</li>
                  <li>Modificación de preferencias</li>
                  <li>Revocación de consentimientos</li>
                  <li>Eliminación completa</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Enlaces Útiles */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Recursos Adicionales</span>
            </h3>
            
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href="/privacy">Política de Privacidad</a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/api/user/preferences">Preferencias de Privacidad</a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
