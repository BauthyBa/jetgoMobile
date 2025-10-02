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
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'

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
  const location = useLocation()
  const budgetTrips = trips.filter((t) => t && (t.budgetMin != null || t.budgetMax != null))
  const section = (location.hash || '#inicio').replace('#', '')
  const [showCreate, setShowCreate] = useState(false)

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
    // Load trips on mount to have data for Trips/Expenses sections
    loadTrips()
  }, [])

  useEffect(() => {
    // Scroll when the hash changes via router navigation
    const hash = location.hash || '#inicio'
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [location.hash])

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

  // Open a room and load/subscribe messages
  const openRoom = async (room) => {
    try {
      const roomId = room?.id
      if (!roomId) return
      setActiveRoomId(roomId)
      window.location.hash = '#chats'
      const initial = await fetchMessages(roomId)
      setMessages(initial)
      if (unsub) {
        try { unsub() } catch {}
      }
      const unsubscribe = subscribeToRoomMessages(roomId, (msg) => {
        setMessages((prev) => [...prev, msg])
      })
      setUnsub(() => unsubscribe)
    } catch (e) {
      alert(e?.message || 'No se pudieron cargar los mensajes')
    }
  }

  // Send a message to the active room
  const handleSend = async () => {
    try {
      if (!activeRoomId || !newMessage.trim()) return
      const saved = await sendMessage(activeRoomId, newMessage)
      if (saved) setNewMessage('')
    } catch (e) {
      alert(e?.message || 'No se pudo enviar el mensaje')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-8" style={{ display: 'grid', gap: 16 }}>
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <>
            {section === 'inicio' && (
              <div id="inicio" style={{ marginBottom: 8 }}>
                <h1 style={{ fontSize: 32, fontWeight: 800 }}>
                  Bienvenido{profile?.meta?.first_name ? (
                    <span style={{ background: 'linear-gradient(135deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', color: 'transparent' }}>{`, ${profile.meta.first_name}`}</span>
                  ) : ''}
                </h1>
                <p className="muted">Aquí está tu resumen de viajes</p>
                <div style={{ marginTop: 12 }}>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await supabase.auth.signOut()
                        localStorage.removeItem('access_token')
                        navigate('/')
                      } catch (e) {
                        alert('No se pudo cerrar sesión')
                      }
                    }}
                  >
                    Cerrar sesión
                  </Button>
                </div>
              </div>
            )}

            {section === 'profile' && (
              <section id="profile">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                  <ProfileCard profile={profile} />
                </div>
              </section>
            )}

            {section === 'chats' && (
              <section id="chats" style={{ marginTop: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
                  <div className="glass-card" style={{ padding: 12 }}>
                    <h3 className="page-title" style={{ color: '#0284c7', marginBottom: 8 }}>Chats</h3>
                    <ChatsCard rooms={rooms} onOpen={openRoom} />
                  </div>
                  <div className="glass-card" style={{ padding: 12, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
                    {!activeRoomId && (
                      <p className="muted">Seleccioná un chat para comenzar</p>
                    )}
                    {activeRoomId && (
                      <>
                        <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {messages.map((m) => (
                              <div key={m.id} className="glass-card" style={{ padding: 8 }}>
                                <div style={{ fontSize: 13 }}>{m.content}</div>
                                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                              </div>
                            ))}
                            {messages.length === 0 && <p className="muted">No hay mensajes aún.</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                          <input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Escribí un mensaje..."
                            className="field"
                            style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.06)' }}
                          />
                          <Button onClick={handleSend}>Enviar</Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>
            )}

            {section === 'trips' && (
              <section id="trips" className="glass-card" style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 className="page-title" style={{ color: '#0284c7' }}>Viajes disponibles</h3>
                  <Button onClick={() => setShowCreate((v) => !v)} className="btn sky">{showCreate ? 'Cancelar' : 'Crear viaje'}</Button>
                </div>
                <div style={{ marginTop: 12 }}>
                  {showCreate && (
                    <div className="glass-card" style={{ padding: 12, marginBottom: 12 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div className="field">
                          <label>Nombre</label>
                          <input value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} placeholder="Ej: Bariloche 2025" />
                        </div>
                        <div className="field">
                          <label>Origen</label>
                          <input value={trip.origin} onChange={(e) => setTrip({ ...trip, origin: e.target.value })} placeholder="Ciudad de origen" />
                        </div>
                        <div className="field">
                          <label>Destino</label>
                          <input value={trip.destination} onChange={(e) => setTrip({ ...trip, destination: e.target.value })} placeholder="Ciudad de destino" />
                        </div>
                        <div className="field">
                          <label>Fecha</label>
                          <input type="date" value={trip.date} onChange={(e) => setTrip({ ...trip, date: e.target.value })} />
                        </div>
                      </div>
                      <div className="actions">
                        <Button
                          onClick={async () => {
                            try {
                              const payload = {
                                name: trip.name,
                                origin: trip.origin,
                                destination: trip.destination,
                                date: trip.date,
                                creator_id: profile?.user_id || null,
                              }
                              const { data } = await api.post('/trips/create/', payload)
                              alert('Viaje creado')
                              setShowCreate(false)
                              setTrip({ name: '', origin: '', destination: '', date: '' })
                              await loadTrips()
                            } catch (e) {
                              alert(e?.response?.data?.error || e?.message || 'No se pudo crear el viaje')
                            }
                          }}
                        >
                          Guardar
                        </Button>
                      </div>
                    </div>
                  )}
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
              </section>
            )}

            {section === 'expenses' && (
              <section id="expenses" className="glass-card" style={{ marginTop: 16 }}>
                <h3 className="page-title" style={{ color: '#0284c7' }}>Gastos</h3>
                <div style={{ marginTop: 12 }}>
                  {budgetTrips.length === 0 && (
                    <p className="muted" style={{ marginTop: 12 }}>No hay datos de gastos disponibles.</p>
                  )}
                  {budgetTrips.length > 0 && (
                    <div style={{ display: 'grid', gap: 8 }}>
                      {budgetTrips.map((t) => (
                        <div key={t.id} className="glass-card" style={{ padding: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{t.name || t.destination}</div>
                              {(t.destination || t.origin) && (
                                <div className="muted" style={{ fontSize: 12 }}>
                                  {[t.origin, t.destination].filter(Boolean).join(' → ')}
                                </div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#3b82f6' }}>
                                {t.budgetMin != null ? `$${t.budgetMin}` : ''}
                                {t.budgetMin != null && t.budgetMax != null ? ' - ' : ''}
                                {t.budgetMax != null ? `$${t.budgetMax}` : ''}
                              </div>
                              <div className="muted" style={{ fontSize: 12 }}>Presupuesto</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}


