import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithGoogle } from '../services/supabase'

export default function Signup() {
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogle = async () => {
    try {
      setLoading(true)
      await signInWithGoogle('/verify-dni?mode=google')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleContinueEmail = () => {
    navigate('/verify-dni?mode=email')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero dark:bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-slate-700/50">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Crear cuenta</h2>
          <p className="text-slate-400 text-sm">Elegí cómo empezar. Luego verificamos tu identidad con el DNI.</p>
        </div>
        
        <div className="space-y-4">
          <button
            type="button"
            onClick={handleContinueEmail}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200"
          >
            Registrarme con email
          </button>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg shadow-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <img src="/google.svg" alt="Google" className="w-5 h-5" />
            {loading ? 'Redirigiendo…' : 'Registrarme con Google'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors">
            Iniciá sesión aquí
          </Link>
        </p>
      </div>
    </div>
  )
}


