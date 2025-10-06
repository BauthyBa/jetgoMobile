import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import { signInWithGoogle } from '../services/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-lg bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-10 border border-slate-700/50 transform scale-110">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-white mb-3">Iniciar sesión</h2>
          <p className="text-slate-400 text-base">Accedé a tu cuenta</p>
        </div>
        
        <form className="space-y-7" onSubmit={handleSubmit}>
          <div className="space-y-3">
            <label htmlFor="email" className="block text-base font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
              placeholder="tu@email.com"
            />
          </div>

          <div className="space-y-3">
            <label htmlFor="password" className="block text-base font-medium text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-4 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-base"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>

          <button
            type="button"
            onClick={async () => {
              try {
                await signInWithGoogle('/dashboard')
              } catch (e) {
                setError(e.message)
              }
            }}
            className="w-full py-4 px-5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg shadow-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 flex items-center justify-center gap-3 text-base"
          >
            <img src="/google.svg" alt="Google" className="w-6 h-6" />
            Continuar con Google
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}
        </form>

        <p className="text-center text-base text-slate-400 mt-8">
          ¿No tenés cuenta?{' '}
          <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors">
            Registrate aquí
          </Link>
        </p>
      </div>
    </div>
  )
}
