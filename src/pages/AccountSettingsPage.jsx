import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, supabase } from '../services/supabase'
import { Bell, Shield, Key, Download, Trash2, User, Mail, Phone, Globe, Sun, Moon, Monitor, LogOut } from 'lucide-react'

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('notifications')
  const [downloadingTrips, setDownloadingTrips] = useState(false)
  const [downloadingData, setDownloadingData] = useState(false)
  const [userTrips, setUserTrips] = useState([])
  const [theme, setTheme] = useState('system')
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)
  const navigate = useNavigate()

  const applyThemePreference = useCallback((value) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark = value === 'dark' || (value === 'system' && prefersDark)
    document.documentElement.classList.toggle('dark', shouldUseDark)
  }, [])

  const broadcastThemeChange = useCallback((value) => {
    if (typeof window === 'undefined') return
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: value }))
  }, [])

  const setThemePreference = useCallback((nextTheme) => {
    setTheme(nextTheme)
    try { localStorage.setItem('theme', nextTheme) } catch {}
    applyThemePreference(nextTheme)
    broadcastThemeChange(nextTheme)
  }, [applyThemePreference, broadcastThemeChange])

  useEffect(() => {
    async function loadProfile() {
      try {
        const session = await getSession()
        if (!session?.user) {
          navigate('/login')
          return
        }

        const user = session.user
        const meta = user?.user_metadata || {}
        
        const localMeta = (() => { 
          try { 
            return JSON.parse(localStorage.getItem('dni_meta') || 'null') 
          } catch { 
            return null 
          }
        })()

        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || null,
          email: user?.email || null,
          meta: mergedMeta,
        }

        setProfile(info)
        
        // Cargar viajes del usuario
        try {
          const { listTrips } = await import('../services/trips')
          const trips = await listTrips()
          const userTripsList = trips.filter(trip => 
            trip.creatorId === info.user_id || 
            (trip.participants && trip.participants.includes(info.user_id))
          )
          setUserTrips(userTripsList)
        } catch (e) {
          console.warn('Error loading user trips:', e)
        }
      } catch (e) {
        console.error('Error loading profile:', e)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme') || 'system'
      setTheme(stored)
      applyThemePreference(stored)
      broadcastThemeChange(stored)
    } catch {
      applyThemePreference('system')
    }
  }, [applyThemePreference, broadcastThemeChange])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => setSystemPrefersDark(event.matches)
    setSystemPrefersDark(media.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    const handleThemeEvent = (event) => {
      const next = event?.detail
      if (!next) return
      setTheme(next)
    }
    window.addEventListener('theme:changed', handleThemeEvent)
    return () => window.removeEventListener('theme:changed', handleThemeEvent)
  }, [])

  const handleThemeSelect = (value) => {
    setThemePreference(value)
  }

  const themeOptions = [
    {
      value: 'light',
      label: 'Tema claro',
      description: 'Colores brillantes y tarjetas luminosas.',
      icon: Sun,
    },
    {
      value: 'dark',
      label: 'Tema oscuro',
      description: 'Ideal para ambientes con poca luz.',
      icon: Moon,
    },
    {
      value: 'system',
      label: 'Tema del sistema',
      description: 'Se adapta automáticamente a tu dispositivo.',
      icon: Monitor,
    },
  ]

  const handleExportData = async () => {
    try {
      setDownloadingData(true)
      
      // Recopilar todos los datos del usuario
      const userData = {
        profile: {
          user_id: profile?.user_id,
          email: profile?.email,
          first_name: profile?.meta?.first_name,
          last_name: profile?.meta?.last_name,
          document_number: profile?.meta?.document_number,
          sex: profile?.meta?.sex,
          birth_date: profile?.meta?.birth_date,
          country: profile?.meta?.country,
          bio: profile?.meta?.bio,
          interests: profile?.meta?.interests,
          favorite_travel_styles: profile?.meta?.favorite_travel_styles,
          avatar_url: profile?.meta?.avatar_url,
          created_at: profile?.meta?.created_at,
          updated_at: profile?.meta?.updated_at
        },
        trips: userTrips,
        export_date: new Date().toISOString(),
        export_version: '1.0'
      }

      // Crear y descargar el archivo JSON
      const dataStr = JSON.stringify(userData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `jetgo-datos-usuario-${profile?.user_id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (e) {
      console.error('Error al exportar los datos:', e)
      alert('Error al exportar los datos: ' + (e?.message || 'Error desconocido'))
    } finally {
      setDownloadingData(false)
    }
  }

  const handleDownloadTripHistory = async () => {
    try {
      setDownloadingTrips(true)
      
      // Crear datos del historial de viajes
      const tripHistoryData = {
        user_id: profile?.user_id,
        user_name: `${profile?.meta?.first_name || ''} ${profile?.meta?.last_name || ''}`.trim(),
        trips: userTrips.map(trip => ({
          id: trip.id,
          title: trip.title,
          description: trip.description,
          from: trip.from,
          to: trip.to,
          departure_date: trip.departure_date,
          return_date: trip.return_date,
          price: trip.price,
          available_seats: trip.available_seats,
          current_participants: trip.current_participants,
          is_creator: trip.creatorId === profile?.user_id,
          status: trip.status,
          created_at: trip.created_at,
          updated_at: trip.updated_at
        })),
        total_trips: userTrips.length,
        export_date: new Date().toISOString(),
        export_version: '1.0'
      }

      // Crear y descargar el archivo JSON
      const dataStr = JSON.stringify(tripHistoryData, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `jetgo-historial-viajes-${profile?.user_id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
    } catch (e) {
      console.error('Error al descargar historial de viajes:', e)
      alert('Error al descargar historial de viajes: ' + (e?.message || 'Error desconocido'))
    } finally {
      setDownloadingTrips(false)
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      try {
        localStorage.removeItem('access_token')
      } catch (_e) {}
      navigate('/login')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p>Cargando configuración...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-white text-center">
          <p>Error al cargar el perfil</p>
          <button 
            onClick={() => navigate('/login')}
            className="btn mt-4"
          >
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-hero pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-28">
        {/* Header */}
        <div className="glass-card mb-6 p-4 sm:p-6">
          <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-center sm:gap-6 sm:text-left">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 text-2xl font-bold text-white">
              {profile?.meta?.first_name ? profile.meta.first_name.charAt(0).toUpperCase() : '?'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Configuración de cuenta</h1>
              <p className="mt-1 text-sm text-slate-300 sm:text-base">Gestiona tu cuenta y preferencias</p>
            </div>
          </div>
        </div>

        {/* Tabs de navegación */}
        <div className="glass-card mb-6 p-1">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3 md:gap-1">
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm transition-colors sm:text-base ${
                activeTab === 'notifications' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Bell size={18} />
              <span className="hidden sm:inline">Notificaciones</span>
            </button>
            <button
              onClick={() => setActiveTab('privacy')}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm transition-colors sm:text-base ${
                activeTab === 'privacy' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <Shield size={18} />
              <span className="hidden sm:inline">Privacidad</span>
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm transition-colors sm:text-base ${
                activeTab === 'account' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
            >
              <User size={18} />
              <span className="hidden sm:inline">Cuenta</span>
            </button>
          </div>
        </div>

        {/* Contenido de las tabs */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Bell size={20} />
                Preferencias de notificaciones
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Notificaciones por email</h3>
                    <p className="text-slate-400 text-sm">Recibe actualizaciones sobre tus viajes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Notificaciones push</h3>
                    <p className="text-slate-400 text-sm">Recibe notificaciones en tiempo real</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Recordatorios de viaje</h3>
                    <p className="text-slate-400 text-sm">Te avisamos antes de tus viajes</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Shield size={20} />
                Configuración de privacidad
              </h2>
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Perfil público</h3>
                    <p className="text-slate-400 text-sm">Permite que otros usuarios vean tu perfil</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Mostrar ubicación</h3>
                    <p className="text-slate-400 text-sm">Comparte tu ubicación con otros usuarios</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
                <div className="flex flex-col gap-3 rounded-lg bg-slate-700/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-white font-medium">Mostrar historial de viajes</h3>
                    <p className="text-slate-400 text-sm">Permite que otros vean tus viajes anteriores</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}


        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <User size={20} />
                Información de cuenta
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400">Email</label>
                    <p className="text-white">{profile?.email || 'No especificado'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Usuario desde</label>
                    <p className="text-white">Enero 2024</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Key size={20} />
                Seguridad
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left"
                >
                  <span className="text-white">Cambiar contraseña</span>
                </button>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Sun size={20} />
                Apariencia
              </h2>
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map((option) => {
                    const isActive = theme === option.value
                    const Icon = option.icon
                    const paletteClass =
                      option.value === 'light'
                        ? 'border-emerald-200/70 bg-white/80 text-slate-800 hover:bg-emerald-50 dark:border-emerald-500/40 dark:bg-slate-800/60 dark:text-white dark:hover:bg-slate-700/60'
                        : option.value === 'dark'
                        ? 'border-slate-700 bg-slate-900/70 text-white hover:bg-slate-800'
                        : 'border-slate-700 bg-slate-800/60 text-white hover:bg-slate-700/60'
                    const iconColor = isActive
                      ? 'text-emerald-400'
                      : option.value === 'light'
                      ? 'text-emerald-500 dark:text-emerald-300'
                      : 'text-emerald-300'
                    return (
                      <button
                        key={option.value}
                        onClick={() => handleThemeSelect(option.value)}
                        disabled={isActive}
                        className={`w-full flex flex-col gap-2 rounded-lg border px-4 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-90 ${paletteClass} ${isActive ? 'ring-2 ring-emerald-400' : ''}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-sm sm:text-base">{option.label}</p>
                            <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-300">
                              {option.description}
                            </p>
                          </div>
                          <Icon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs text-slate-500 sm:text-sm dark:text-slate-300">
                  {theme === 'system'
                    ? `Siguiendo el tema del sistema (${systemPrefersDark ? 'oscuro' : 'claro'}).`
                    : theme === 'dark'
                    ? 'El tema oscuro está activo en tu dispositivo.'
                    : 'El tema claro está activo en tu dispositivo.'}
                </p>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Download size={20} />
                Datos
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={handleExportData}
                  disabled={downloadingData}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Download size={20} className="text-emerald-400" />
                  <span className="text-white">{downloadingData ? 'Exportando...' : 'Exportar mis datos'}</span>
                </button>
                <button 
                  onClick={handleDownloadTripHistory}
                  disabled={downloadingTrips}
                  className="w-full p-4 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  <Download size={20} className="text-blue-400" />
                  <span className="text-white">{downloadingTrips ? 'Descargando...' : 'Descargar historial de viajes'}</span>
                </button>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <LogOut size={20} />
                Sesión
              </h2>
              <div className="space-y-3">
                <button
                  onClick={handleLogout}
                  className="w-full p-4 bg-emerald-500/20 rounded-lg border border-emerald-400/40 text-left text-white transition-colors hover:bg-emerald-500/30 flex items-center gap-3"
                >
                  <LogOut size={20} className="text-emerald-300" />
                  <span>Cerrar sesión</span>
                </button>
              </div>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Trash2 size={20} />
                Zona de peligro
              </h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/profile')}
                  className="w-full p-4 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors text-left flex items-center gap-3"
                >
                  <Trash2 size={20} className="text-red-400" />
                  <span className="text-red-400">Eliminar cuenta</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
