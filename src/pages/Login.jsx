import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setOk(false)
    try {
      await login(email, password)
      setOk(true)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h2 className="page-title">Iniciar sesión</h2>
        <form className="form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <div className="actions">
            <button className="btn" type="submit" disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
          </div>
          {ok && <p className="success">Sesión iniciada. Token guardado.</p>}
          {error && <pre className="error">{error}</pre>}
        </form>
      </div>
    </div>
  )
}


