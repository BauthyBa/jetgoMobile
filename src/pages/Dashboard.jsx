import { useEffect, useState } from 'react'
import { getSession, supabase, updateUserMetadata } from '../services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages, inviteByEmail } from '@/services/chat'
import { api } from '@/services/api'
import { listTrips as fetchTrips, joinTrip } from '@/services/trips'
import TripFilters from '@/components/TripFilters'
import TripGrid from '@/components/TripGrid'
import DashboardLayout from '@/components/DashboardLayout'
import GlassCard from '@/components/GlassCard'
import ProfileCard from '@/components/ProfileCard'
import ChatsCard from '@/components/ChatsCard'
import { upsertProfileToBackend } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  
  const [trip, setTrip] = useState({ name: '', origin: '', destination: '', date: '' })
  const [tab, setTab] = useState('chats')
  const [tripsBase, setTripsBase] = useState([])
  const [trips, setTrips] = useState([])
  const [joiningId, setJoiningId] = useState(null)
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [unsub, setUnsub] = useState(null)
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
        if (mounted && info.user_id) {
          try {
            const r = await listRoomsForUser(info.user_id)
            if (mounted) setRooms(r)
          } catch (e) {
            console.warn('No se pudieron cargar salas:', e?.message || e)
          }
        }
      } catch (e) {
        if (mounted) setError(e?.message || 'Error al leer la sesión')
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    return () => { if (unsub) try { unsub() } catch {} }
  }, [unsub])

  async function loadTrips() {
    try {
      const normalized = await fetchTrips()
      setTripsBase(normalized)
      setTrips(normalized)
    } catch (e) { /* noop */ }
  }

  return (
    <DashboardLayout>
      <div className="p-8" style={{ display: 'grid', gap: 16 }}>
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <>
            <div style={{ marginBottom: 8 }}>
              <h1 style={{ fontSize: 32, fontWeight: 800 }}>
                Bienvenido{profile?.meta?.first_name ? (
                  <span style={{ background: 'linear-gradient(135deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{`, ${profile.meta.first_name}`}</span>
                ) : ''}
              </h1>
              <p className="muted">Aquí está tu resumen de viajes</p>
            </div>

            {/* Removed hardcoded stat cards to avoid defaults */}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <ProfileCard profile={profile} />
              <ChatsCard rooms={rooms} />
            </div>

            <div id="trips" className="glass-card" style={{ marginTop: 16 }}>
              <h3 className="page-title" style={{ color: '#0284c7' }}>Viajes disponibles</h3>
              <div style={{ marginTop: 12 }}>
                <TripFilters baseTrips={tripsBase} onFilter={setTrips} />
                {trips.length === 0 && <p className="muted" style={{ marginTop: 12 }}>No hay viajes que coincidan.</p>}
                {trips.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <TripGrid
                      trips={trips}
                      joiningId={joiningId}
                      onJoin={async (t) => {
                        try {
                          if (!profile?.user_id) throw new Error('Sin usuario')
                          setJoiningId(t.id)
                          const data = await joinTrip(t.id, profile.user_id)
                          if (data?.ok !== false) {
                            alert('Te uniste al viaje')
                            const r = await listRoomsForUser(profile.user_id)
                            setRooms(r)
                          } else {
                            alert(data?.error || 'No se pudo unir al viaje')
                          }
                        } catch (e) {
                          alert(e?.message || 'Error al unirse')
                        } finally {
                          setJoiningId(null)
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}


