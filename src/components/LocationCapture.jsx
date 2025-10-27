import { useState, useEffect } from 'react'
import { MapPin, Navigation, X, Send, Loader } from 'lucide-react'
import SimpleLocationMap from './SimpleLocationMap'

export default function LocationCapture({ onLocationSend, onCancel }) {
  const [currentLocation, setCurrentLocation] = useState(null)
  const [address, setAddress] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    getCurrentLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      setError('La geolocalización no está disponible en este dispositivo')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      let bestPosition = null
      let bestAccuracy = Infinity

      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 20000,
              maximumAge: 0,
            })
          })

          if (position.coords.accuracy < bestAccuracy) {
            bestPosition = position
            bestAccuracy = position.coords.accuracy
          }

          if (position.coords.accuracy <= 10) {
            break
          }

          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (err) {
          console.warn(`Intento ${attempt + 1} para obtener ubicación falló:`, err)
          if (attempt === 2) throw err
        }
      }

      if (!bestPosition) {
        throw new Error('No se pudo obtener una ubicación precisa')
      }

      const { latitude, longitude } = bestPosition.coords
      setCurrentLocation({ latitude, longitude })
      await getAddressFromCoords(latitude, longitude)
    } catch (err) {
      console.error('Error getting location:', err)
      if (err.code === 1) {
        setError('Permisos de ubicación denegados. Por favor, permite el acceso a la ubicación.')
      } else if (err.code === 2) {
        setError('Ubicación no disponible. Verifica tu conexión a internet.')
      } else if (err.code === 3) {
        setError('Tiempo de espera agotado. Intenta nuevamente.')
      } else {
        setError('Error obteniendo ubicación. Intenta nuevamente.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&extratags=1`,
        {
          headers: {
            'User-Agent': 'JetGoApp/1.0',
          },
        },
      )
      const data = await response.json()

      if (data.display_name) {
        let formattedAddress = data.display_name

        if (data.address) {
          const addr = data.address
          const parts = []

          if (addr.house_number && addr.road) {
            parts.push(`${addr.road} ${addr.house_number}`)
          } else if (addr.road) {
            parts.push(addr.road)
          }

          if (addr.suburb || addr.neighbourhood) {
            parts.push(addr.suburb || addr.neighbourhood)
          }

          if (addr.city || addr.town || addr.village) {
            parts.push(addr.city || addr.town || addr.village)
          }

          if (addr.state) {
            parts.push(addr.state)
          }

          if (addr.country) {
            parts.push(addr.country)
          }

          if (parts.length > 0) {
            formattedAddress = parts.join(', ')
          }
        }

        setAddress(formattedAddress)
      }
    } catch (err) {
      console.error('Error getting address:', err)
    }
  }

  const handleSendLocation = async () => {
    if (!currentLocation) return

    setIsLoading(true)
    try {
      await onLocationSend({
        ...currentLocation,
        address,
        timestamp: new Date().toISOString(),
        isLive,
      })
    } catch (err) {
      console.error('Error sending location:', err)
      setError('Error enviando ubicación')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleLiveLocation = () => setIsLive((prev) => !prev)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900/95 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">{isLive ? 'Ubicación en vivo' : 'Compartir ubicación'}</h3>
          </div>
          <button
            onClick={onCancel}
            className="rounded-full p-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          {error ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-300">
                <MapPin className="h-8 w-8" />
              </div>
              <p className="text-sm font-medium text-red-200">{error}</p>
              <p className="mt-2 text-xs text-slate-400">
                Asegurate de habilitar los permisos de ubicación en tu navegador o dispositivo.
              </p>
              <button
                onClick={getCurrentLocation}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400"
                type="button"
              >
                Intentar nuevamente
              </button>
            </div>
          ) : isLoading && !currentLocation ? (
            <div className="py-10 text-center text-slate-200">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-600 border-t-emerald-400"></div>
              Obteniendo ubicación...
            </div>
          ) : currentLocation ? (
            <div className="space-y-4">
              <SimpleLocationMap
                latitude={currentLocation.latitude}
                longitude={currentLocation.longitude}
                address={address}
                timestamp={new Date().toISOString()}
                isLive={isLive}
              />

              <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
                <div className="flex items-center gap-2">
                  <Navigation className="h-4 w-4 text-emerald-400" />
                  <span className="font-medium">Ubicación en vivo</span>
                </div>
                <button
                  onClick={toggleLiveLocation}
                  className={`relative h-6 w-12 rounded-full transition ${
                    isLive ? 'bg-emerald-500' : 'bg-slate-600/70'
                  }`}
                  type="button"
                >
                  <span
                    className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
                      isLive ? 'right-1' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              {address && (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Dirección aproximada</div>
                  <div className="mt-1 text-sm text-white">{address}</div>
                </div>
              )}
            </div>
          ) : null}
        </div>

        {currentLocation && (
          <div className="flex items-center gap-3 border-t border-white/10 bg-slate-950/40 px-5 py-4">
            <button
              onClick={onCancel}
              className="w-full rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
              type="button"
            >
              Cancelar
            </button>
            <button
              onClick={handleSendLocation}
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
            >
              {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isLive ? 'Iniciar en vivo' : 'Enviar ubicación'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
