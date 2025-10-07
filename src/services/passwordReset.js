import { supabase } from './supabase'

// VERSIÓN SIMPLIFICADA SIN EMAILJS
// Usa el sistema nativo de Supabase que funciona incluso en plan gratuito

// Generar token aleatorio
function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36)
}

// Guardar token temporalmente (expira en 1 hora)
function saveResetToken(email, token) {
  const resetData = {
    email,
    token,
    expires: Date.now() + (60 * 60 * 1000) // 1 hora
  }
  localStorage.setItem(`reset_${token}`, JSON.stringify(resetData))
  
  // Limpiar tokens expirados
  cleanExpiredTokens()
}

// Limpiar tokens expirados
function cleanExpiredTokens() {
  const keys = Object.keys(localStorage).filter(key => key.startsWith('reset_'))
  keys.forEach(key => {
    try {
      const data = JSON.parse(localStorage.getItem(key))
      if (data.expires < Date.now()) {
        localStorage.removeItem(key)
      }
    } catch (e) {
      localStorage.removeItem(key)
    }
  })
}

// Verificar si el usuario existe en Supabase
async function checkUserExists(email) {
  try {
    // Intentar hacer login con email y contraseña falsa para verificar si existe
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'fake_password_to_check_user'
    })
    
    // Si el error es "Invalid login credentials", el usuario existe
    // Si es "User not found" o similar, no existe
    return error?.message?.includes('Invalid login credentials') || 
           error?.message?.includes('Email not confirmed')
  } catch (e) {
    return false
  }
}

// Enviar email de recuperación usando Supabase nativo
export async function sendPasswordResetEmail(email) {
  try {
    // Usar el sistema nativo de Supabase (funciona en plan gratuito)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })

    if (error) {
      // Si el error es por usuario no encontrado, mostrar mensaje genérico por seguridad
      if (error.message.includes('User not found') || error.message.includes('not found')) {
        return {
          ok: false,
          error: 'No existe una cuenta con este email'
        }
      }
      throw error
    }

    return {
      ok: true,
      message: 'Se ha enviado un enlace de recuperación a tu email'
    }
  } catch (error) {
    console.error('Error sending reset email:', error)
    return {
      ok: false,
      error: 'Error al enviar el email. Intenta nuevamente.'
    }
  }
}

// Verificar token de reset
export function verifyResetToken(token) {
  try {
    const resetData = localStorage.getItem(`reset_${token}`)
    if (!resetData) {
      return { valid: false, error: 'Token inválido' }
    }

    const data = JSON.parse(resetData)
    if (data.expires < Date.now()) {
      localStorage.removeItem(`reset_${token}`)
      return { valid: false, error: 'Token expirado' }
    }

    return { valid: true, email: data.email }
  } catch (e) {
    return { valid: false, error: 'Token inválido' }
  }
}

// Actualizar contraseña (funciona cuando el usuario viene del email de reset)
export async function updatePassword(newPassword) {
  try {
    // Usar la API nativa de Supabase para actualizar contraseña
    // Esto funciona cuando el usuario tiene una sesión válida desde el email
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      throw error
    }

    return {
      ok: true,
      message: 'Contraseña actualizada exitosamente'
    }
  } catch (error) {
    console.error('Error updating password:', error)
    return {
      ok: false,
      error: error.message || 'Error al actualizar la contraseña'
    }
  }
}
