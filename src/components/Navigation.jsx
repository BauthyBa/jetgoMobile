import { Button } from '@/components/ui/button'
import { Link, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import ColorBar from '@/components/ColorBar'
import ProfileMenu from '@/components/ProfileMenu'
import { MapPin, MessageCircle, Plus, Search, UserRound, Users, Heart, PenSquare, CloudSun } from 'lucide-react'
import WeatherModal from '@/components/WeatherModal'
import { getWeatherData } from '@/services/weather'

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false)
  const [user, setUser] = useState(null)
  const [forceHidden, setForceHidden] = useState(false)
  const [weatherModalOpen, setWeatherModalOpen] = useState(false)
  const [weatherLoading, setWeatherLoading] = useState(false)
  const [weatherError, setWeatherError] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [lastRequest, setLastRequest] = useState({ type: 'geo', query: null })
  const location = useLocation()

  const hideNavLinks =
    location.pathname === '/viajes' ||
    location.pathname.startsWith('/crear-viaje') ||
    location.pathname === '/amigos' ||
    location.pathname === '/chats' ||
    location.pathname === '/modern-chat' ||
    location.pathname === '/social' ||
    location.pathname.startsWith('/profile')

  useEffect(() => {
    let mounted = true
    getSession().then((s) => {
      if (mounted) {
        setLoggedIn(!!s?.user)
        setUser(s?.user || null)
      }
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) {
        setLoggedIn(!!session?.user)
        setUser(session?.user || null)
      }
    })
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const handleVisibilityChange = (event) => {
      if (!event || typeof event.detail?.hidden !== 'boolean') return
      setForceHidden(event.detail.hidden)
    }

    window.addEventListener('app:navigation-visibility', handleVisibilityChange)
    return () => window.removeEventListener('app:navigation-visibility', handleVisibilityChange)
  }, [])

  const requestWeather = useCallback(async () => {
    setWeatherLoading(true)
    setWeatherError(null)
    setWeatherData(null)

    const getCurrentCoordinates = () =>
      new Promise((resolve, reject) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          reject(new Error('Geolocalización no disponible'))
          return
        }
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (error) => reject(error),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
        )
      })

    try {
      const coords = await getCurrentCoordinates()
      const weather = await getWeatherData({
        lat: coords.latitude,
        lon: coords.longitude,
      })
      setWeatherData(weather)
      setLastRequest({ type: 'geo', query: null })
    } catch (geoError) {
      console.warn('No se pudo obtener la ubicación precisa, usando fallback:', geoError)
      try {
        const fallbackWeather = await getWeatherData({
          city: 'Buenos Aires,AR',
          label: 'Buenos Aires, AR',
          note: 'No pudimos detectar tu ubicación. Mostramos un clima de referencia.',
        })
        setWeatherData(fallbackWeather)
        setLastRequest({ type: 'fallback', query: 'Buenos Aires,AR' })
      } catch (fallbackError) {
        console.error('Error al cargar clima de fallback:', fallbackError)
        setWeatherError(fallbackError?.message || 'No se pudo obtener el clima.')
      }
    } finally {
      setWeatherLoading(false)
    }
  }, [])

  const openWeatherModal = useCallback(() => {
    setWeatherModalOpen(true)
    requestWeather()
  }, [requestWeather])

  const closeWeatherModal = useCallback(() => {
    setWeatherModalOpen(false)
  }, [])

  const searchWeatherByCity = useCallback(
    async (query) => {
      const trimmed = query.trim()
      if (!trimmed) return
      setWeatherLoading(true)
      setWeatherError(null)
      try {
        const weather = await getWeatherData({
          city: trimmed,
          label: trimmed,
        })
        setWeatherData(weather)
        setLastRequest({ type: 'city', query: trimmed })
      } catch (searchError) {
        console.error('No se pudo obtener el clima buscado:', searchError)
        setWeatherError(searchError?.message || 'No se pudo obtener el clima para esa ubicación.')
      } finally {
        setWeatherLoading(false)
      }
    },
    [],
  )

  const retryWeather = useCallback(() => {
    if (lastRequest.type === 'city' && lastRequest.query) {
      searchWeatherByCity(lastRequest.query)
    } else {
      requestWeather()
    }
  }, [lastRequest, requestWeather, searchWeatherByCity])

  const navItems = useMemo(
    () => [
      {
        label: 'Viajes',
        path: '/viajes',
        icon: MapPin,
        isActive: (pathname) => pathname === '/viajes' || pathname.startsWith('/trip'),
      },
      {
        label: 'Chats',
        path: '/chats',
        icon: MessageCircle,
        isActive: (pathname) => pathname === '/chats' || pathname.startsWith('/modern-chat') || pathname.startsWith('/dashboard'),
      },
      {
        label: 'Perfil',
        path: '/profile',
        icon: UserRound,
        isActive: (pathname) => pathname.startsWith('/profile'),
      },
      {
        label: 'Amigos',
        path: '/amigos',
        icon: Users,
        isActive: (pathname) => pathname.startsWith('/amigos'),
      },
      {
        label: 'Social',
        path: '/social',
        icon: Heart,
        isActive: (pathname) => pathname.startsWith('/social'),
      },
    ],
    [],
  )

  const isOnSocial = location.pathname.startsWith('/social')
  const isOnTrips = location.pathname === '/viajes'
  const hideNavigation = ['/login', '/register', '/signup', '/verify-dni'].includes(location.pathname)
  const hideBottomNav = hideNavigation

  if (hideNavigation || forceHidden) {
    return null
  }

  return (
    <>
      <WeatherModal
        isOpen={weatherModalOpen}
        onClose={closeWeatherModal}
        loading={weatherLoading}
        error={weatherError}
        weather={weatherData}
        onRetry={retryWeather}
        onSearchCity={searchWeatherByCity}
      />
      <nav className="fixed top-0 z-50 hidden w-full md:block glass-nav relative" style={{ position: 'fixed' }}>
        <ColorBar />
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <div className="flex flex-shrink-0 items-center gap-2">
            <img src="/jetgo.png?v=2" alt="JetGo" width="36" height="36" />
            <Link
              to="/"
              className="text-3xl font-extrabold text-slate-900 transition-colors hover:text-emerald-500 dark:text-white dark:hover:text-emerald-400"
            >
              JetGo
            </Link>
          </div>
          {!hideNavLinks && (
            <div className="absolute left-1/2 hidden -translate-x-1/2 items-center space-x-8 md:flex">
              <a
                href="#como-funciona"
                className="font-medium text-slate-600 transition-colors hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-400"
              >
                Cómo funciona
              </a>
              <a
                href="#beneficios"
                className="font-medium text-slate-600 transition-colors hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-400"
              >
                Beneficios
              </a>
              <a
                href="#testimonios"
                className="font-medium text-slate-600 transition-colors hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-400"
              >
                Testimonios
              </a>
            </div>
          )}
          <div className="ml-auto flex flex-shrink-0 items-center space-x-3">
            <Link to="/viajes" className="hidden md:flex">
              <Button
                variant="secondary"
                className="flex items-center gap-2 border border-emerald-100/60 bg-white/80 px-4 py-2 font-medium text-slate-900 shadow-lg backdrop-blur-md hover:bg-white/90 hover:text-emerald-600 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
              >
                <Search className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                <span className="hidden sm:inline">Buscar viajes</span>
                <span className="sm:hidden">🔍</span>
              </Button>
            </Link>
            <Button
              type="button"
              variant="secondary"
              onClick={openWeatherModal}
              className="hidden items-center gap-2 border border-sky-200/70 bg-sky-50/90 px-4 py-2 font-medium text-slate-700 shadow-lg hover:border-sky-300 hover:bg-sky-100 hover:text-sky-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 md:flex"
            >
              <CloudSun className="h-4 w-4 text-sky-500 dark:text-sky-300" />
              <span className="hidden sm:inline">Ver clima</span>
              <span className="sm:hidden">☀️</span>
            </Button>
            <Link to="/crear-viaje">
              <Button className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2 font-medium text-white hover:from-emerald-500 hover:to-emerald-400">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Crear Viaje</span>
                <span className="sm:hidden">+</span>
              </Button>
            </Link>
            <ProfileMenu isLoggedIn={loggedIn} user={user} />
          </div>
        </div>
      </nav>

      {!hideBottomNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200/70 bg-white/70 backdrop-blur-xl shadow-lg dark:border-white/10 dark:bg-slate-900/90 md:hidden">
          <div className="mx-auto flex max-w-xl justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = item.isActive(location.pathname)
              const isSocialItem = item.path === '/social'
              const isTripsItem = item.path === '/viajes'
              const showCreatePostAction = isSocialItem && isOnSocial
              const showMyTripsAction = isTripsItem && isOnTrips
              const DisplayIcon = showCreatePostAction ? PenSquare : Icon
              const label = showCreatePostAction ? 'Crear' : showMyTripsAction ? 'Creados' : item.label
              const baseClass = `flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                active
                  ? 'text-emerald-500 dark:text-emerald-400'
                  : 'text-slate-700 hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-200'
              }`

              if (showCreatePostAction) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('social:create-post'))
                      }
                    }}
                    className={baseClass}
                    aria-label="Crear post"
                  >
                    <DisplayIcon
                      className={`h-5 w-5 ${
                        active
                          ? 'fill-emerald-500/25 text-emerald-500 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-200'
                      }`}
                    />
                    <span className="mt-1">{label}</span>
                  </button>
                )
              }

              if (showMyTripsAction) {
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('viajes:show-mine'))
                      }
                    }}
                    className={baseClass}
                    aria-label="Ver mis viajes creados"
                  >
                    <DisplayIcon
                      className={`h-5 w-5 ${
                        active
                          ? 'fill-emerald-500/25 text-emerald-500 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-200'
                      }`}
                    />
                    <span className="mt-1">{label}</span>
                  </button>
                )
              }

              return (
                <Link key={item.path} to={item.path} className={baseClass}>
                  <DisplayIcon
                    className={`h-5 w-5 ${
                      active
                        ? 'fill-emerald-500/25 text-emerald-500 dark:text-emerald-400'
                        : 'text-slate-600 dark:text-slate-200'
                    }`}
                  />
                  <span className="mt-1">{label}</span>
                </Link>
              )
            })}
            <button
              type="button"
              onClick={openWeatherModal}
              className="flex flex-1 flex-col items-center rounded-xl px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:text-emerald-500 dark:text-slate-200 dark:hover:text-emerald-200"
              aria-label="Ver clima"
            >
              <CloudSun className="h-5 w-5 text-sky-500 dark:text-sky-300" />
              <span className="mt-1">Clima</span>
            </button>
          </div>
        </nav>
      )}
    </>
  )
}
