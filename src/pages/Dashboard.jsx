import { useEffect, useState } from 'react'
import { getSession, supabase, updateUserMetadata } from '../services/supabase'
import { upsertProfileToBackend } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const session = await getSession()
        const user = session?.user || null
        const meta = user?.user_metadata || {}

        // Backend JWT (login por email)
        const accessToken = localStorage.getItem('access_token')
        const decodeJwt = (token) => {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
            return JSON.parse(jsonPayload)
          } catch {
            return null
          }
        }
        const jwtPayload = accessToken ? decodeJwt(accessToken) : null

        // Estrategia de verificación:
        // - Si hay sesión Supabase (Google), exigir meta.dni_verified o flag local
        // - Si NO hay sesión Supabase pero hay JWT del backend (login email), asumir verificado
        const supaVerified = (
          meta?.dni_verified === true ||
          !!meta?.document_number ||
          !!meta?.dni ||
          localStorage.getItem('dni_verified') === 'true'
        )
        const hasSupabase = !!user
        const hasBackendJwt = !!jwtPayload
        const verified = hasSupabase ? supaVerified : hasBackendJwt ? true : false

        if (!verified) {
          navigate('/verify-dni')
          return
        }

        const localMeta = (() => { try { return JSON.parse(localStorage.getItem('dni_meta') || 'null') } catch { return null } })()
        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || jwtPayload?.user_id || jwtPayload?.sub || null,
          email: user?.email || jwtPayload?.email || null,
          expISO: null,
          meta: mergedMeta,
          dni_verified: verified,
        }

        // Si hay sesión de Supabase y el metadata aún no tiene DNI, pero local sí, sincronizar a Supabase
        if (user && (!meta?.document_number && localMeta?.document_number)) {
          try {
            await updateUserMetadata({ ...localMeta, dni_verified: true })
          } catch (e) {
            console.warn('No se pudo sincronizar metadata a Supabase:', e?.message || e)
          }
          try {
            await upsertProfileToBackend({
              user_id: user.id,
              email: info.email,
              ...localMeta,
            })
          } catch (e) {
            console.warn('No se pudo sincronizar perfil al backend:', e?.message || e)
          }
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
            {profile.meta && (
              <div style={{ marginTop: 12 }}>
                <p className="muted">Datos de DNI:</p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '6px 0 0 0' }}>
                  {profile.meta.first_name && <li>Nombre: {profile.meta.first_name}</li>}
                  {profile.meta.last_name && <li>Apellido: {profile.meta.last_name}</li>}
                  {profile.meta.document_number && <li>Documento: {profile.meta.document_number}</li>}
                  {profile.meta.sex && <li>Sexo: {profile.meta.sex}</li>}
                  {profile.meta.birth_date && <li>Nacimiento: {profile.meta.birth_date}</li>}
                </ul>
              </div>
            )}
            <div className="actions" style={{ marginTop: 16 }}>
              <button className="btn secondary" type="button" onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('dni_verified'); window.location.href = '/' }}>Cerrar sesión</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


