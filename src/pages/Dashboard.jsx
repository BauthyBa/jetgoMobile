import { useEffect, useState } from 'react'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = localStorage.getItem('access_token')
        if (!token) throw new Error('No hay sesión activa')
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
        const payload = JSON.parse(jsonPayload)
        const expDate = payload.exp ? new Date(payload.exp * 1000) : null
        const info = {
          user_id: payload.user_id || payload.sub || null,
          email: payload.email || null,
          expISO: expDate ? expDate.toISOString() : null,
        }
        if (mounted) setProfile(info)
      } catch (e) {
        if (mounted) setError(e?.message || 'Error al leer la sesión')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="container">
      <div className="card">
        <h2 className="page-title">Dashboard</h2>
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <div>
            <p>Bienvenido{profile.email ? `, ${profile.email}` : ''}.</p>
            {profile.user_id && <p className="muted">Usuario: {profile.user_id}</p>}
            {profile.expISO && <p className="muted">Expira: {new Date(profile.expISO).toLocaleString()}</p>}
          </div>
        )}
      </div>
    </div>
  )
}


