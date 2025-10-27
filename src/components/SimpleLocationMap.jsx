import { MapPin, Navigation, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function SimpleLocationMap({ latitude, longitude, address, timestamp, isLive = false }) {
  const [mapError, setMapError] = useState(false)
  const [currentMapUrl, setCurrentMapUrl] = useState('')
  const [showIframe, setShowIframe] = useState(false)

  const googleMapsStaticUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=18&size=400x200&maptype=roadmap&markers=color:red%7C${latitude},${longitude}&key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgU6xUqYI0`
  const fallbackMapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${latitude},${longitude}&zoom=18&size=400x200&maptype=mapnik&markers=${latitude},${longitude},red&format=png`
  const mapboxUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-marker+ff0000(${longitude},${latitude})/${longitude},${latitude},18,0/400x200@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`
  const osmUrl = `https://tile.openstreetmap.org/18/${Math.floor(((longitude + 180) / 360) * Math.pow(2, 18))}/${Math.floor(
    ((1 - Math.log(Math.tan((latitude * Math.PI) / 180) + 1 / Math.cos((latitude * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, 18),
  )}.png`
  const googleMapsEmbedUrl = `https://www.google.com/maps/embed/v1/view?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dOWWgU6xUqYI0&center=${latitude},${longitude}&zoom=18&maptype=roadmap`
  const simpleGoogleMapsUrl = `https://maps.google.com/maps?q=${latitude},${longitude}&z=18&output=embed`

  useEffect(() => {
    setCurrentMapUrl(googleMapsStaticUrl)
    setMapError(false)
    setShowIframe(false)
  }, [googleMapsStaticUrl])

  const createFallbackSVG = () => {
    const svgContent = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="400" height="200" fill="#1f2937"/>
      <rect x="0" y="0" width="400" height="200" fill="#2d3748" opacity="0.3"/>
      <circle cx="200" cy="100" r="12" fill="#10b981" stroke="#ffffff" stroke-width="3"/>
      <circle cx="200" cy="100" r="4" fill="#ffffff"/>
      <text x="200" y="130" text-anchor="middle" fill="#10b981" font-family="Arial" font-size="14" font-weight="bold">
        ${latitude.toFixed(6)}, ${longitude.toFixed(6)}
      </text>
      <text x="200" y="150" text-anchor="middle" fill="#9ca3af" font-family="Arial" font-size="10">
        Ubicacion compartida
      </text>
    </svg>`

    try {
      return `data:image/svg+xml;base64,${btoa(svgContent)}`
    } catch (error) {
      console.error('Error creando SVG fallback:', error)
      return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iIzFmMjkzNyIvPjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjMTBiOTgxIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiPk1hcGEgbm8gZGlzcG9uaWJsZTwvdGV4dD48L3N2Zz4='
    }
  }

  const handleIframeError = () => {
    setMapError(true)
  }

  const handleMapClick = () => {
    const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`
    window.open(googleMapsUrl, '_blank')
  }

  return (
    <div className="relative">
      <div className="h-48 w-full overflow-hidden rounded-xl border border-slate-700/60 shadow-inner" onClick={handleMapClick}>
        {!showIframe ? (
          <img
            src={currentMapUrl}
            alt="Ubicación en el mapa"
            className="h-full w-full object-cover"
            onError={() => {
              if (currentMapUrl === googleMapsStaticUrl) {
                setCurrentMapUrl(fallbackMapUrl)
              } else if (currentMapUrl === fallbackMapUrl) {
                setCurrentMapUrl(mapboxUrl)
              } else if (currentMapUrl === mapboxUrl) {
                setCurrentMapUrl(osmUrl)
              } else {
                setShowIframe(true)
              }
            }}
          />
        ) : (
          <iframe
            src={simpleGoogleMapsUrl || googleMapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación en el mapa"
            onError={handleIframeError}
          />
        )}

        {mapError && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <img src={createFallbackSVG()} alt="Ubicación en el mapa (fallback)" className="h-full w-full object-cover" />
          </div>
        )}

        <div className="absolute top-2 left-2 right-2 rounded-lg bg-black/70 p-2 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <MapPin className="h-3 w-3" />
            <span className="font-medium">{isLive ? 'Ubicación en vivo' : 'Ubicación compartida'}</span>
          </div>
        </div>

        <div className="absolute bottom-2 right-2">
          <button className="flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white shadow-sm transition hover:bg-emerald-700">
            <Navigation className="h-3 w-3" />
            Abrir en Maps
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-700/50 bg-slate-900/80 p-3 text-xs text-slate-300">
        <div className="flex items-center gap-2 text-sm text-emerald-300">
          <MapPin className="h-4 w-4" />
          <span className="font-medium">{isLive ? 'Ubicación en vivo' : 'Ubicación compartida'}</span>
        </div>
        {address && <div className="mt-1 truncate text-sm text-slate-100">{address}</div>}
        <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timestamp ? new Date(timestamp).toLocaleString() : 'Ahora'}
          </span>
          <span className="inline-flex items-center gap-1">
            <Navigation className="h-3 w-3" />
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </span>
        </div>
        <div className="mt-2 text-[11px] text-slate-500">
          <span className="text-emerald-400">📍</span> Precisión: Alta precisión GPS
        </div>
      </div>
    </div>
  )
}
