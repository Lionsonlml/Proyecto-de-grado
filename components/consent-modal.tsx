'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, Brain, Share2, Mail, BarChart3 } from 'lucide-react'

interface ConsentModalProps {
  isOpen: boolean
  onAccept: (preferences: UserPreferences) => void
  onReject: () => void
  onConfigure: (preferences: UserPreferences) => void
}

interface UserPreferences {
  data_collection: boolean
  ai_analysis: boolean
  data_sharing: boolean
  marketing_emails: boolean
  analytics_tracking: boolean
}

export function ConsentModal({ isOpen, onAccept, onReject, onConfigure }: ConsentModalProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    data_collection: false,
    ai_analysis: false,
    data_sharing: false,
    marketing_emails: false,
    analytics_tracking: false,
  })

  const [showDetails, setShowDetails] = useState(false)

  if (!isOpen) return null

  const handlePreferenceChange = (key: keyof UserPreferences, value: boolean) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  const handleAcceptAll = () => {
    const allAccepted = {
      data_collection: true,
      ai_analysis: true,
      data_sharing: false, // Por defecto no compartir
      marketing_emails: false, // Por defecto no marketing
      analytics_tracking: true,
    }
    onAccept(allAccepted)
  }

  const handleAcceptSelected = () => {
    onAccept(preferences)
  }

  const handleConfigure = () => {
    onConfigure(preferences)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Privacidad y Protección de Datos</CardTitle>
          <CardDescription className="text-base">
            TimeWize respeta tu privacidad. Te explicamos qué datos recopilamos y cómo los usamos.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Tu privacidad es importante:</strong> Todos los datos sensibles están cifrados y solo tú puedes acceder a ellos.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">¿Qué datos recopilamos?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Tareas y horarios:</strong> Para optimizar tu productividad</li>
              <li>• <strong>Estados de ánimo:</strong> Para análisis de patrones (opcional)</li>
              <li>• <strong>Uso de la aplicación:</strong> Para mejorar la experiencia</li>
              <li>• <strong>Datos de análisis:</strong> Para estadísticas anónimas</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">¿Para qué los usamos?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• <strong>Personalización:</strong> Adaptar la app a tus necesidades</li>
              <li>• <strong>Análisis con IA:</strong> Proporcionar insights inteligentes</li>
              <li>• <strong>Mejoras:</strong> Optimizar funcionalidades</li>
              <li>• <strong>Estadísticas:</strong> Datos agregados y anónimos</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">¿Con quién se comparten?</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Nadie.</strong> Tus datos personales no se comparten con terceros. 
                Solo se usan para mejorar tu experiencia en TimeWize.
              </p>
            </div>
          </div>

          {!showDetails ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleAcceptAll} className="flex-1">
                Aceptar Todo
              </Button>
              <Button variant="outline" onClick={() => setShowDetails(true)} className="flex-1">
                Configurar Permisos
              </Button>
              <Button variant="destructive" onClick={onReject} className="flex-1">
                Rechazar
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Configurar Permisos</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="data_collection"
                      checked={preferences.data_collection}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange('data_collection', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="data_collection" className="flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span className="font-medium">Recopilación de datos básicos</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Necesario para el funcionamiento básico de la aplicación
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="ai_analysis"
                      checked={preferences.ai_analysis}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange('ai_analysis', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="ai_analysis" className="flex items-center space-x-2">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">Análisis con Inteligencia Artificial</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Para generar insights personalizados y recomendaciones
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="data_sharing"
                      checked={preferences.data_sharing}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange('data_sharing', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="data_sharing" className="flex items-center space-x-2">
                        <Share2 className="h-4 w-4" />
                        <span className="font-medium">Compartir datos con terceros</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Actualmente no compartimos datos, pero puedes habilitar para futuras integraciones
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="marketing_emails"
                      checked={preferences.marketing_emails}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange('marketing_emails', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="marketing_emails" className="flex items-center space-x-2">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Emails de marketing</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Recibir notificaciones sobre nuevas funcionalidades y consejos
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="analytics_tracking"
                      checked={preferences.analytics_tracking}
                      onCheckedChange={(checked) => 
                        handlePreferenceChange('analytics_tracking', checked as boolean)
                      }
                    />
                    <div className="flex-1">
                      <Label htmlFor="analytics_tracking" className="flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4" />
                        <span className="font-medium">Análisis de uso</span>
                      </Label>
                      <p className="text-sm text-muted-foreground ml-6">
                        Para mejorar la aplicación con datos de uso anónimos
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleAcceptSelected} className="flex-1">
                  Aceptar Selección
                </Button>
                <Button variant="outline" onClick={handleConfigure} className="flex-1">
                  Guardar y Continuar
                </Button>
                <Button variant="destructive" onClick={onReject} className="flex-1">
                  Rechazar Todo
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center pt-4 border-t">
            <p>
              Puedes cambiar estas preferencias en cualquier momento desde tu perfil. 
              <br />
              <a href="/privacy" className="underline hover:text-foreground">
                Ver política de privacidad completa
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
