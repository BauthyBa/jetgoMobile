import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'

export default function BackButtonHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let unregister = null

    const appPlugin = Capacitor.Plugins?.App
    if (!appPlugin?.addListener) {
      console.warn('Capacitor App plugin no disponible, se omite handler nativo.')
      return
    }

    unregister = appPlugin.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        navigate(-1)
        return
      }

      if (window.history.length > 1) {
        navigate(-1)
        return
      }

      // Estamos en la raíz sin historial; evitar que Android cierre la app por defecto
    })

    return () => {
      if (unregister?.remove) unregister.remove()
    }
  }, [navigate])

  return null
}
