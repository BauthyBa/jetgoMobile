import axios from 'axios'
import { supabase } from './supabase'

function normalizeBaseUrl(url) {
  if (!url) return null
  return url.replace(/\/+$/, '')
}

const REMOTE_API_BASE_URL = normalizeBaseUrl('https://jetgoback.onrender.com/api')
const ENV_BASE_URL = normalizeBaseUrl(import.meta.env.VITE_API_BASE_URL)
const LOCAL_CANDIDATE = normalizeBaseUrl(import.meta.env.VITE_LOCAL_API_BASE_URL) || normalizeBaseUrl('http://localhost:8000/api')

const INITIAL_API_BASE_URL = ENV_BASE_URL || LOCAL_CANDIDATE || REMOTE_API_BASE_URL

export const api = axios.create({ baseURL: INITIAL_API_BASE_URL })
export const apiPublic = axios.create({ baseURL: INITIAL_API_BASE_URL })

let resolvedApiBaseUrl = INITIAL_API_BASE_URL

function applyBaseUrl(baseUrl) {
  if (!baseUrl || baseUrl === resolvedApiBaseUrl) return
  resolvedApiBaseUrl = baseUrl
  api.defaults.baseURL = baseUrl
  apiPublic.defaults.baseURL = baseUrl
  console.info(`[api] Base URL set to ${baseUrl}`)
}

function isBrowserEnvironment() {
  return typeof window !== 'undefined' && typeof window.fetch === 'function'
}

async function isBackendReachable(baseUrl) {
  if (!isBrowserEnvironment()) return false
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), 2500)
  try {
    const response = await fetch(`${baseUrl}/test/`, {
      method: 'GET',
      signal: controller.signal,
      credentials: 'omit',
    })
    return response.ok
  } catch (_error) {
    return false
  } finally {
    window.clearTimeout(timeoutId)
  }
}

function uniqueUrls(urls) {
  return urls.filter((url, index) => url && urls.indexOf(url) === index)
}

export async function initializeApiBaseUrl() {
  if (!isBrowserEnvironment()) {
    return resolvedApiBaseUrl
  }

  const host = window.location.hostname
  const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(host)

  const candidateOrder = uniqueUrls([
    isLocalHost ? LOCAL_CANDIDATE : null,
    resolvedApiBaseUrl,
    REMOTE_API_BASE_URL,
  ])

  for (const candidate of candidateOrder) {
    if (!candidate) continue
    if (resolvedApiBaseUrl === candidate) {
      const alreadyReachable = await isBackendReachable(candidate)
      if (alreadyReachable) {
        return resolvedApiBaseUrl
      }
    } else {
      const reachable = await isBackendReachable(candidate)
      if (reachable) {
        applyBaseUrl(candidate)
        return resolvedApiBaseUrl
      }
    }
  }

  // Si ninguno respondió, mantener la URL actual (probablemente REMOTE_API_BASE_URL).
  return resolvedApiBaseUrl
}

export function getApiBaseUrl() {
  return resolvedApiBaseUrl
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    localStorage.setItem('access_token', token)
  } else {
    delete api.defaults.headers.common['Authorization']
    localStorage.removeItem('access_token')
  }
}

function isTokenExpired(token) {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const { exp } = JSON.parse(jsonPayload)
    if (!exp) return true
    const nowSec = Math.floor(Date.now() / 1000)
    return exp <= nowSec
  } catch (e) {
    return true
  }
}

const saved = localStorage.getItem('access_token')
if (saved) {
  if (isTokenExpired(saved)) {
    setAuthToken(null)
  } else {
    setAuthToken(saved)
  }
}

api.interceptors.response.use(
  (r) => r,
  (error) => {
    const code = error?.response?.data?.code
    if (error?.response?.status === 401 && (code === 'token_not_valid' || code === 'user_not_authenticated')) {
      setAuthToken(null)
    }
    return Promise.reject(error)
  }
)

export async function registerUser(payload) {
  const { data } = await apiPublic.post('/auth/register/', payload)
  try {
    if (payload?.email && payload?.password) {
      await supabase.auth.signUp({ email: payload.email, password: payload.password })
    }
  } catch (_e) {
    // No bloquear registro backend si Supabase falla; el usuario podrá loguearse luego
  }
  return data
}

export async function login(email, password) {
  const { data } = await apiPublic.post('/auth/login/', { email, password })
  setAuthToken(data.access)
  try {
    await supabase.auth.signInWithPassword({ email, password })
  } catch (_e) {
    // Si falla Supabase, el dashboard básico funciona, pero el chat (RLS) no.
  }
  return data
}

export async function upsertProfileToBackend(payload) {
  const { data } = await api.post('/auth/upsert_profile/', payload)
  return data
}

// Funciones para reseñas (usando Supabase)
export async function createReview(payload) {
  // Preferir endpoint autenticado del backend. Si falla, degradar a endpoint público y finalmente a Supabase directo.
  try {
    const { data } = await api.post('/reviews/create/', payload)
    if (data?.ok) return data
    // Si el backend no devuelve ok pero no explota, forzar el mismo shape esperado.
    if (data && typeof data === 'object') {
      return { ok: true, review: data.review || data }
    }
  } catch (ePrimary) {
    try {
      const { data } = await api.post('/supabase/reviews/create/', payload)
      if (data?.ok) return data
      if (data && typeof data === 'object') {
        return { ok: true, review: data.review || data }
      }
    } catch (_eSecond) {
      // Continuar con fallback a Supabase
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const supabaseUser = authData?.user
      if (!supabaseUser) {
        throw new Error('Debes iniciar sesión para dejar una reseña')
      }

      const insertPayload = {
        reviewer_id: supabaseUser.id,
        reviewed_user_id: payload.reviewed_user_id,
        rating: payload.rating,
        comment: payload.comment || null,
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert(insertPayload)
        .select(
          `id, reviewer_id, reviewed_user_id, rating, comment, created_at,
           reviewer:User!reviews_reviewer_id_fkey(nombre, apellido, avatar_url)`
        )
        .single()

      if (error) throw error

      return { ok: true, review: data }
    } catch (supabaseError) {
      const msg =
        supabaseError?.response?.data?.error ||
        supabaseError?.message ||
        ePrimary?.response?.data?.error ||
        ePrimary?.message ||
        'No se pudo crear la reseña'
      return { ok: false, error: msg }
    }
  }
}

export async function getUserReviews(userId) {
  try {
    const { data } = await apiPublic.get(`/supabase/reviews/user/?user_id=${userId}`)
    return data
  } catch (primaryError) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(
          `id, reviewer_id, reviewed_user_id, rating, comment, created_at,
           reviewer:User!reviews_reviewer_id_fkey(nombre, apellido, avatar_url)`
        )
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error

      const reviews = (data || []).map((review) => {
        const reviewerName = [review?.reviewer?.nombre, review?.reviewer?.apellido]
          .filter(Boolean)
          .join(' ')
        return {
          ...review,
          reviewer_name: reviewerName || 'Anónimo',
        }
      })

      const total = reviews.length
      const average =
        total === 0 ? 0 : reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total

      const distribution = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
      reviews.forEach((r) => {
        const key = String(Math.max(1, Math.min(5, Math.round(r.rating || 0))))
        distribution[key] += 1
      })

      return {
        ok: true,
        reviews,
        statistics: {
          total_reviews: total,
          average_rating: average,
          rating_distribution: distribution,
        },
      }
    } catch (fallbackError) {
      const msg =
        fallbackError?.message ||
        primaryError?.response?.data?.error ||
        primaryError?.message ||
        'Error al cargar las reseñas'
      return { ok: false, error: msg }
    }
  }
}

export async function getUserProfile(userId) {
  const { data } = await apiPublic.get(`/profile/user/?user_id=${userId}`)
  return data
}

// Funciones para notificaciones
export async function getUserNotifications(userId, limit = 20) {
  try {
    console.log('🔔 Llamando a getUserNotifications con userId:', userId)
    const response = await apiPublic.get(`/supabase/notifications/?user_id=${userId}&limit=${limit}`)
    console.log('🔔 Respuesta completa:', response)
    return response.data
  } catch (error) {
    console.error('🔔 Error fetching notifications:', error)
    console.error('🔔 Error response:', error.response?.data)
    throw error
  }
}

export async function markNotificationRead(notificationId, userId) {
  const { data } = await apiPublic.post('/supabase/notifications/read/', {
    notification_id: notificationId,
    user_id: userId
  })
  return data
}

export async function markAllNotificationsRead(userId) {
  const { data } = await apiPublic.post('/supabase/notifications/read-all/', {
    user_id: userId
  })
  return data
}

// Funciones para reportes de usuarios
export async function createUserReport(payload) {
  const { data } = await apiPublic.post('/reports/create/', payload)
  return data
}

export async function getUserReports(userId, type = 'received') {
  const { data } = await apiPublic.get(`/reports/user/?user_id=${userId}&type=${type}`)
  return data
}

export async function checkUserSuspension(userId) {
  const { data } = await apiPublic.get(`/reports/suspension/?user_id=${userId}`)
  return data
}

export async function getReportReasons() {
  const { data } = await apiPublic.get('/reports/reasons/')
  return data
}

// Función para subir imagen de evidencia a Supabase Storage
export async function uploadReportEvidence(file, userId) {
  try {
    const { supabase } = await import('./supabase')
    
    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}/${Date.now()}.${fileExt}`
    
    // Subir archivo al bucket report-evidence
    const { data, error } = await supabase.storage
      .from('report-evidence')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      throw error
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabase.storage
      .from('report-evidence')
      .getPublicUrl(fileName)

    return {
      ok: true,
      url: urlData.publicUrl,
      path: fileName
    }
  } catch (error) {
    return {
      ok: false,
      error: error.message
    }
  }
}

// Función para obtener avatar_url de un usuario
export async function getUserAvatar(userId) {
  try {
    const response = await api.get('/profile/avatar/', {
      params: { user_id: userId }
    })
    return response.data
  } catch (error) {
    console.error('Error getting user avatar:', error)
    return { ok: false, error: error.message }
  }
}

// Funciones para recuperación de contraseña
export { sendPasswordResetEmail, updatePassword } from './passwordReset'


