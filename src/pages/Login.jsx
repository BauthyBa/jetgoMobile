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

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle('/dashboard')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="container py-12">
      <div className="card w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <h2 className="page-title text-2xl font-semibold">Iniciar sesión</h2>
          <p className="muted mt-2 mb-6">Accedé a tu cuenta con email y contraseña, o con Google.</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-4 pt-2">
            <button className="btn w-full hover:scale-[1.02] hover:shadow-md transition-all duration-200" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
            <div className="flex items-center gap-2">
              <hr className="flex-1 border-t border-white/20" />
              <span className="muted text-xs">o continuar con</span>
              <hr className="flex-1 border-t border-white/20" />
            </div>
            <button className="btn secondary w-full hover:scale-[1.02] hover:shadow-md transition-all duration-200" type="button" onClick={handleGoogleSignIn}>Continuar con Google</button>
          </div>
          {error && <pre className="error mt-4 text-center">{error}</pre>}
        </form>
        <p className="muted text-sm text-center mt-6">
          ¿No tenés cuenta? <Link to="/signup" className="font-medium text-blue-400 hover:underline">Registrate aquí</Link>
        </p>
      </div>
    </div>
  )
}


