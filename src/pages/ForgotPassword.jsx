import { useState } from 'react'
import { Link } from 'react-router-dom'
import GlassCard from '@/components/GlassCard'
import { sendPasswordResetEmail } from '@/services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email.trim()) {
      setError('Por favor ingresa tu email')
      return
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Por favor ingresa un email válido')
      return
    }

    try {
      setLoading(true)
      setError('')

      const response = await sendPasswordResetEmail(email.trim())

      if (response.ok) {
        setSuccess(true)
      } else {
        setError(response.error || 'Error al enviar el email de recuperación')
      }
    } catch (err) {
      setError(err.message || 'Error al enviar el email de recuperación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <GlassCard>
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔑</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                ¿Olvidaste tu contraseña?
              </h1>
              <p className="text-gray-300 text-sm">
                Ingresa tu email y te enviaremos un enlace para recuperar tu cuenta
              </p>
            </div>

            {success ? (
              /* Mensaje de éxito */
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-white font-medium mb-2">Email enviado</h3>
                <p className="text-gray-300 text-sm mb-6">
                  Revisa tu bandeja de entrada y haz clic en el enlace para restablecer tu contraseña.
                </p>
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-6">
                  <p className="text-blue-400 text-xs">
                    💡 Si no ves el email, revisa tu carpeta de spam
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                >
                  ← Volver al login
                </Link>
              </div>
            ) : (
              /* Formulario */
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                {/* Botón de envío */}
                <button
                  type="submit"
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                </button>

                {/* Enlaces */}
                <div className="text-center space-y-2">
                  <Link
                    to="/login"
                    className="block text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    ← Volver al login
                  </Link>
                  <Link
                    to="/register"
                    className="block text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    ¿No tienes cuenta? Regístrate
                  </Link>
                </div>
              </form>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
