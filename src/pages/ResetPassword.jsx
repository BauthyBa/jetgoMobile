import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import GlassCard from '@/components/GlassCard'
import { updatePassword } from '@/services/api'
import { supabase } from '@/services/supabase'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Verificar si hay una sesión válida para reset
  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error checking session:', error)
          setError('Enlace de recuperación inválido o expirado')
          setCheckingSession(false)
          return
        }

        if (session) {
          setValidSession(true)
        } else {
          setError('Enlace de recuperación inválido o expirado')
        }
      } catch (err) {
        console.error('Error:', err)
        setError('Error al verificar el enlace de recuperación')
      } finally {
        setCheckingSession(false)
      }
    }

    checkSession()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!password.trim()) {
      setError('Por favor ingresa una nueva contraseña')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await updatePassword(password)

      if (response.ok) {
        setSuccess(true)
        // Redirigir al login después de 3 segundos
        setTimeout(() => {
          navigate('/login', { 
            state: { message: 'Contraseña actualizada exitosamente. Inicia sesión con tu nueva contraseña.' }
          })
        }, 3000)
      } else {
        setError(response.error || 'Error al actualizar la contraseña')
      }
    } catch (err) {
      setError(err.message || 'Error al actualizar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GlassCard>
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Verificando enlace de recuperación...</p>
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  if (!validSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <GlassCard>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">❌</span>
              </div>
              <h1 className="text-xl font-bold text-white mb-2">
                Enlace inválido
              </h1>
              <p className="text-gray-300 text-sm mb-6">
                {error || 'El enlace de recuperación es inválido o ha expirado'}
              </p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors"
              >
                Solicitar nuevo enlace
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard>
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔒</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Nueva contraseña
              </h1>
              <p className="text-gray-300 text-sm">
                Ingresa tu nueva contraseña para tu cuenta
              </p>
            </div>

            {success ? (
              /* Mensaje de éxito */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-white font-medium mb-2">¡Contraseña actualizada!</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Tu contraseña ha sido cambiada exitosamente.
                </p>
                <p className="text-blue-400 text-sm">
                  Redirigiendo al login...
                </p>
              </div>
            ) : (
              /* Formulario */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nueva contraseña
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Confirmar contraseña
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite tu nueva contraseña"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Indicador de fortaleza de contraseña */}
                {password && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      <span className={password.length >= 6 ? 'text-green-400' : 'text-gray-400'}>
                        Mínimo 6 caracteres
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${password === confirmPassword && confirmPassword ? 'bg-green-500' : 'bg-gray-500'}`}></span>
                      <span className={password === confirmPassword && confirmPassword ? 'text-green-400' : 'text-gray-400'}>
                        Las contraseñas coinciden
                      </span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Botón de envío */}
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || !password || !confirmPassword || password !== confirmPassword}
                >
                  {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>

                {/* Nota de seguridad */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-xs">
                    🔒 Tu nueva contraseña será encriptada y almacenada de forma segura
                  </p>
                </div>
              </form>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
