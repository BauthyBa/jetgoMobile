import axios from 'axios'

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
  return data
}

export async function login(email, password) {
  const { data } = await apiPublic.post('/auth/login/', { email, password })
  setAuthToken(data.access)
  return data
}


