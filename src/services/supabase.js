export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(SUPABASE_URL || 'https://pamidjksvzshakzkrtdy.supabase.co', SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhbWlkamtzdnpzaGFremtydGR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3ODgzODMsImV4cCI6MjA2OTM2NDM4M30.sjYTaPhMNymAiJI63Ia9Z7i9ur6izKqRawpkNBSEJdw')

export async function signInWithGoogle(redirectPath = '/dashboard') {
  // Detectar si estamos en una aplicación móvil
  const isMobile = window.Capacitor && window.Capacitor.isNativePlatform()
  
  console.log('🔍 Debug OAuth:', {
    isMobile,
    platform: window.Capacitor?.getPlatform(),
    userAgent: navigator.userAgent
  })
  
  let redirectTo
  if (isMobile) {
    // Para aplicaciones móviles, usar página de callback personalizada
    redirectTo = 'https://jetgo.com.ar/auth-callback.html'
    // Alternativa: usar URL de Supabase directamente
    // redirectTo = 'https://pamidjksvzshakzkrtdy.supabase.co/auth/v1/callback'
  } else {
    // Para web, usar la URL normal
    redirectTo = window.location.origin + redirectPath
  }

  console.log('🔗 Redirect URL:', redirectTo)

  try {
    console.log('🚀 Iniciando OAuth con Google...')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    })
    
    console.log('📱 OAuth Response:', JSON.stringify({ data, error }, null, 2))
    
    if (error) {
      console.error('❌ OAuth Error:', error)
      throw error
    }
    
    console.log('✅ OAuth exitoso, datos:', data)
    return data
  } catch (err) {
    console.error('💥 Error en OAuth:', err)
    throw err
  }
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function updateUserMetadata(metadata) {
  const { data, error } = await supabase.auth.updateUser({ data: metadata })
  if (error) throw error
  return data
}


// Función para cerrar sesión
export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

// Función para obtener el usuario actual
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

// Función para manejar el deep link de autenticación
export async function handleAuthCallback() {
  console.log('🔄 Manejando callback de autenticación...')
  
  try {
    // Esperar más tiempo para que Supabase procese la autenticación
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // Intentar múltiples veces obtener la sesión
    for (let i = 0; i < 3; i++) {
      console.log(`🔍 Intento ${i + 1}/3 de obtener sesión...`)
      
      const { data, error } = await supabase.auth.getSession()
      console.log('🔍 Datos de sesión:', { data, error })
      
      if (error) {
        console.error('❌ Error al obtener sesión:', error)
        if (i === 2) throw error // Solo lanzar error en el último intento
        await new Promise(resolve => setTimeout(resolve, 2000))
        continue
      }
      
      if (data.session) {
        console.log('✅ Usuario autenticado:', data.session.user.email)
        return data.session
      }
      
      // Si no hay sesión, intentar obtener el usuario directamente
      console.log('⚠️ No hay sesión activa, intentando obtener usuario...')
      const { data: userData, error: userError } = await supabase.auth.getUser()
      console.log('🔍 Datos de usuario:', { userData, userError })
      
      if (userData.user) {
        console.log('✅ Usuario encontrado:', userData.user.email)
        return { user: userData.user }
      }
      
      // Esperar antes del siguiente intento
      if (i < 2) {
        console.log('⏳ Esperando antes del siguiente intento...')
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log('⚠️ No se pudo obtener el usuario después de 3 intentos')
    return null
  } catch (err) {
    console.error('💥 Error en handleAuthCallback:', err)
    throw err
  }
}
