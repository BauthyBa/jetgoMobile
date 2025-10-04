import axios from 'axios'

// Usar SIEMPRE el proxy interno para evitar CORS y ocultar la API key
const client = axios.create({ baseURL: '/api/tripadvisor' })

export async function searchLocations(query, { category = 'attractions', language = 'es' } = {}) {
  if (!query || !String(query).trim()) return []
  const { data } = await client.get('', { params: { action: 'search', query, category, language } })
  return Array.isArray(data?.data) ? data.data : data?.results || []
}

export async function getLocationDetails(locationId, { language = 'es' } = {}) {
  if (!locationId) return null
  const { data } = await client.get('', { params: { action: 'details', locationId, language } })
  return data || null
}

export async function getLocationPhotos(locationId, { language = 'es', limit = 5 } = {}) {
  if (!locationId) return []
  const { data } = await client.get('', { params: { action: 'photos', locationId, language, limit } })
  return Array.isArray(data?.data) ? data.data : data?.photos || []
}

export async function getLocationReviews(locationId, { language = 'es', limit = 5 } = {}) {
  if (!locationId) return []
  const { data } = await client.get('', { params: { action: 'reviews', locationId, language, limit } })
  return Array.isArray(data?.data) ? data.data : data?.reviews || []
}

