import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="container">
      <div className="card">
        <h2 className="page-title">Crear cuenta</h2>
        <p className="muted">Elegí cómo empezar. Luego verificamos tu identidad con el DNI.</p>
        <div className="actions" style={{ justifyContent: 'center', marginTop: 12 }}>
          <button className="btn" type="button" onClick={handleContinueEmail}>Registrarme con email</button>
          <button className="btn secondary" type="button" onClick={handleGoogle} disabled={loading}>
            {loading ? 'Redirigiendo…' : 'Registrarme con Google'}
          </button>
        </div>
        {error && <pre className="error" style={{ marginTop: 12 }}>{error}</pre>}
      </div>
    </div>
  )
}


