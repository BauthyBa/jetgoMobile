import axios from 'axios'
import { supabase } from './supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export const api = axios.create({ baseURL: API_BASE_URL })
export const apiPublic = axios.create({ baseURL: API_BASE_URL })

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

// Funciones para reseñas
export async function createReview(payload) {
  const { data } = await apiPublic.post('/reviews/create/', payload)
  return data
}

export async function getUserReviews(userId) {
  const { data } = await apiPublic.get(`/reviews/user/?user_id=${userId}`)
  return data
}

export async function getUserProfile(userId) {
  const { data } = await apiPublic.get(`/profile/user/?user_id=${userId}`)
  return data
}


