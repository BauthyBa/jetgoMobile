import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CloudSun, Loader2, MapPin, RefreshCcw, Sunrise, Sunset, Wind, Droplets, Search } from 'lucide-react'

function formatTime(unixSeconds, offsetSeconds = 0) {
  if (!unixSeconds) return '--'
  try {
    const localDate = new Date((unixSeconds + offsetSeconds) * 1000)
    return localDate.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '--'
  }
}

export default function WeatherModal({
  isOpen,
  onClose,
  loading,
  error,
  weather,
  onRetry,
  onSearchCity,
}) {
  if (!isOpen) return null

  const iconUrl = weather?.icon ? `https://openweathermap.org/img/wn/${weather.icon}@4x.png` : null
  const offset = weather?.timezoneOffset ?? 0
  const lastUpdate = weather?.timestamp ? formatTime(weather.timestamp, offset) : null
  const windSpeedKm = weather?.wind != null ? Math.round(Number(weather.wind) * 3.6) : null
  const [cityQuery, setCityQuery] = useState('')

  useEffect(() => {
    if (weather?.location) {
      setCityQuery(weather.location)
    }
  }, [weather?.location, isOpen])

  const handleSearch = (event) => {
    event.preventDefault()
    if (!onSearchCity) return
    const trimmed = cityQuery.trim()
    if (!trimmed) return
    onSearchCity(trimmed)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-2xl backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/95">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Condiciones actuales
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-900 dark:text-white">
              <CloudSun className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />
              Clima
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>

        <form onSubmit={handleSearch} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={cityQuery}
              onChange={(event) => setCityQuery(event.target.value)}
              placeholder="Buscar ciudad o país (ej: Madrid, ES)"
              className="pl-10"
              disabled={loading}
            />
          </div>
          <Button type="submit" disabled={loading}>
            Buscar
          </Button>
        </form>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-12 text-slate-500 dark:text-slate-300">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            <span>Cargando clima...</span>
          </div>
        )}

        {!loading && error && (
          <div className="py-12 text-center text-slate-600 dark:text-slate-300">
            <p className="mb-6 text-sm">{error}</p>
            <div className="flex flex-col items-center gap-3">
              <Button variant="secondary" onClick={onRetry} className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4" />
                Reintentar
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {!loading && !error && weather && (
          <>
            <div className="mt-6 flex items-start gap-4">
              {iconUrl && (
                <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800/40">
                  <img src={iconUrl} alt="Ícono del clima" className="h-20 w-20 object-contain" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                  <span>{weather.location}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-slate-900 dark:text-white">
                    {Number.isFinite(weather.temperature) ? `${weather.temperature}°` : '--'}
                  </span>
                  <span className="text-base capitalize text-slate-500 dark:text-slate-300">
                    {weather.description}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sensación térmica:{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {Number.isFinite(weather.feelsLike) ? `${weather.feelsLike}°C` : '--'}
                  </span>
                </p>
                {weather.note && (
                  <p className="text-xs font-medium text-amber-600 dark:text-amber-300">{weather.note}</p>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  <Droplets className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                  Humedad
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {weather.humidity != null ? `${weather.humidity}%` : '--'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  <Wind className="h-4 w-4 text-sky-500 dark:text-sky-300" />
                  Viento
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {windSpeedKm != null ? `${windSpeedKm} km/h` : '--'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  <Sunrise className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                  Amanecer
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatTime(weather.sunrise, offset)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400 dark:text-slate-400">
                  <Sunset className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                  Atardecer
                </div>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatTime(weather.sunset, offset)}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-4 w-4 text-emerald-500 dark:text-emerald-300" />
                <span>
                  Actualizado:
                  <strong className="ml-1 text-slate-600 dark:text-slate-200">
                    {lastUpdate || '--'}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={onRetry} className="flex items-center gap-2 text-xs">
                  <RefreshCcw className="h-4 w-4" />
                  Actualizar
                </Button>
                <Button onClick={onClose} className="text-xs">
                  Listo
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
