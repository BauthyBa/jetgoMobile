const OPEN_WEATHER_API_KEY = 'fa32fa4be0cf23249680e2becc0a9bc5'

export { OPEN_WEATHER_API_KEY }

export async function getWeatherData({ lat = null, lon = null, city = null, label = null, note = null } = {}) {
  if (lat == null && lon == null && !city) {
    throw new Error('No se proporcionó una ubicación válida')
  }

  const query =
    lat != null && lon != null ? `lat=${lat}&lon=${lon}` : `q=${encodeURIComponent(city)}`

  const response = await fetch(
    `https://api.openweathermap.org/data/2.5/weather?${query}&units=metric&lang=es&appid=${OPEN_WEATHER_API_KEY}`,
  )

  if (!response.ok) {
    throw new Error('No se pudo obtener el clima en este momento.')
  }

  const data = await response.json()

  const locationName =
    label ||
    [data?.name, data?.sys?.country].filter(Boolean).join(', ') ||
    'Ubicación desconocida'

  return {
    location: locationName,
    temperature: Math.round(data?.main?.temp ?? 0),
    feelsLike: Math.round(data?.main?.feels_like ?? 0),
    description: data?.weather?.[0]?.description || 'Sin información',
    humidity: data?.main?.humidity ?? 0,
    wind: Number(data?.wind?.speed ?? 0),
    icon: data?.weather?.[0]?.icon || null,
    sunrise: data?.sys?.sunrise ?? null,
    sunset: data?.sys?.sunset ?? null,
    timestamp: data?.dt ?? null,
    timezoneOffset: data?.timezone ?? 0,
    note: note || null,
  }
}
