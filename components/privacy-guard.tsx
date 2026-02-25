'use client'

import { useState, useEffect } from 'react'
import { ConsentModal } from './consent-modal'
import { getUserPreferences, saveUserPreferences, recordConsent } from '@/lib/privacy'

interface PrivacyGuardProps {
  children: React.ReactNode
  userId: number
}

export function PrivacyGuard({ children, userId }: PrivacyGuardProps) {
  const [showConsentModal, setShowConsentModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkConsentStatus()
  }, [userId])

  const checkConsentStatus = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        credentials: 'include',
      })
      
      if (response.ok) {
        const preferences = await response.json()
        // Si no hay preferencias, mostrar modal de consentimiento
        if (!preferences) {
          setShowConsentModal(true)
        }
      } else {
        // Si hay error, mostrar modal de consentimiento
        setShowConsentModal(true)
      }
    } catch (error) {
      console.error('Error verificando consentimiento:', error)
      setShowConsentModal(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAcceptConsent = async (preferences: any) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          preferences,
          consent: {
            scope: 'general',
            accepted: true,
            version: '1.0',
          },
        }),
      })

      if (response.ok) {
        setShowConsentModal(false)
      } else {
        console.error('Error guardando preferencias')
      }
    } catch (error) {
      console.error('Error guardando consentimiento:', error)
    }
  }

  const handleRejectConsent = () => {
    // Redirigir a página de política de privacidad o mostrar mensaje
    window.location.href = '/privacy'
  }

  const handleConfigureConsent = async (preferences: any) => {
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          preferences,
          consent: {
            scope: 'configured',
            accepted: true,
            version: '1.0',
          },
        }),
      })

      if (response.ok) {
        setShowConsentModal(false)
      } else {
        console.error('Error guardando preferencias')
      }
    } catch (error) {
      console.error('Error guardando consentimiento:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      {children}
      <ConsentModal
        isOpen={showConsentModal}
        onAccept={handleAcceptConsent}
        onReject={handleRejectConsent}
        onConfigure={handleConfigureConsent}
      />
    </>
  )
}
