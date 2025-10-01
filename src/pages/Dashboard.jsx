import { useEffect, useState } from 'react'
import { getSession, supabase, updateUserMetadata } from '../services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages, inviteByEmail } from '@/services/chat'
import { api } from '@/services/api'
import { upsertProfileToBackend } from '../services/api'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  
  const [trip, setTrip] = useState({ name: '', origin: '', destination: '', date: '' })
  const [tab, setTab] = useState('chats')
  const [trips, setTrips] = useState([])
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
      const { data } = await api.get('/trips/list/')
      if (data?.ok) setTrips(data.trips || [])
    } catch (e) { /* noop */ }
  }

  return (
    <div className="container dashboard-sky">
      <div className="card glass-card" style={{ borderColor: 'rgba(155, 235, 255, 0.35)' }}>
        <h2 className="page-title" style={{ color: '#3b82f6' }}>Dashboard</h2>
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <div>
            <p style={{ color: '#0ea5e9' }}>Bienvenido{profile.email ? `, ${profile.email}` : ''}.</p>
            {profile.user_id && <p className="muted">Usuario: {profile.user_id}</p>}
            {profile.meta && (
              <div style={{ marginTop: 12 }}>
                <p className="muted" style={{ color: '#0284c7' }}>Datos de DNI:</p>
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
              <button className="btn secondary sky" type="button" onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem('dni_verified'); window.location.href = '/' }}>Cerrar sesión</button>
            </div>

            {/* Tabs */}
            <div className="actions" style={{ marginTop: 20, gap: 8 }}>
              <button className={`btn ${tab==='chats'?'':'secondary'}`} type="button" onClick={()=>setTab('chats')}>Chats</button>
              <button className={`btn ${tab==='trips'?'':'secondary'}`} type="button" onClick={()=>{ setTab('trips'); loadTrips() }}>Viajes</button>
            </div>

            {/* Crear viaje: card separada */}
            <div className="card glass-card" style={{ marginTop: 20 }}>
              <h3 className="page-title" style={{ color: '#0284c7' }}>Crear viaje</h3>
              <div className="form" style={{ marginTop: 8 }}>
                <div className="field">
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <input value={trip.name} onChange={(e)=>setTrip((t)=>({...t,name:e.target.value}))} placeholder="Nombre" />
                    <input type="date" value={trip.date} onChange={(e)=>setTrip((t)=>({...t,date:e.target.value}))} />
                    <input value={trip.origin} onChange={(e)=>setTrip((t)=>({...t,origin:e.target.value}))} placeholder="Origen" />
                    <input value={trip.destination} onChange={(e)=>setTrip((t)=>({...t,destination:e.target.value}))} placeholder="Destino" />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn" type="button" onClick={async ()=>{
                      try {
                        if (!profile?.user_id) throw new Error('Sin usuario')
                        const { data } = await api.post('/trips/create/', {
                          creator_id: profile.user_id,
                          name: trip.name || undefined,
                          origin: trip.origin || undefined,
                          destination: trip.destination || undefined,
                          date: trip.date ? new Date(trip.date).toISOString() : undefined,
                        })
                        if (data?.ok && data?.room) {
                          setRooms((prev)=>[data.room, ...prev])
                          alert('Viaje creado y chat generado')
                        } else {
                          alert(data?.error || 'No se pudo crear el viaje')
                        }
                      } catch (e) {
                        alert(e?.message || 'Error creando viaje')
                      }
                    }}>Crear viaje</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chats card (sin crear sala manual) */}
            {tab==='chats' && (
            <div className="card glass-card" style={{ marginTop: 20 }}>
              <h3 className="page-title" style={{ color: '#0284c7' }}>Chats</h3>
              <div style={{ marginTop: 12 }}>
                <p className="muted">Mis salas</p>
                {rooms.length === 0 && <p className="muted">Aún no tienes salas.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0 0', display: 'grid', gap: 8 }}>
                  {rooms.map((r) => (
                    <li key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span>{r.name}</span>
                      <div className="actions" style={{ marginTop: 0 }}>
                        <button className="btn" type="button" onClick={async () => {
                          setActiveRoomId(r.id)
                          try {
                            const msgs = await fetchMessages(r.id)
                            setMessages(msgs)
                          } catch (e) { console.warn(e) }
                          if (unsub) try { unsub() } catch {}
                          const _unsub = subscribeToRoomMessages(r.id, (m) => setMessages((prev) => [...prev, m]))
                          setUnsub(() => _unsub)
                        }}>Abrir</button>
                        <button className="btn secondary" type="button" onClick={async () => {
                          const email = prompt('Email a invitar:')
                          if (!email) return
                          try {
                            await inviteByEmail(r.id, email, profile.user_id)
                            alert('Invitación enviada (si el email existe, recibirá un correo).')
                          } catch (e) {
                            alert(`No se pudo enviar la invitación: ${e?.message || e}`)
                          }
                        }}>Invitar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {activeRoomId && (
                <div className="card glass-card" style={{ marginTop: 16 }}>
                  <h4 className="page-title" style={{ color: '#0ea5e9' }}>Sala</h4>
                  <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid rgba(155,235,255,0.2)', borderRadius: 12, padding: 8 }}>
                    {messages.length === 0 && <p className="muted">Sin mensajes aún.</p>}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
                      {messages.map((m) => (
                        <li key={m.id} className="muted" style={{ color: m.user_id === profile.user_id ? '#22d3ee' : undefined }}>
                          <span style={{ fontSize: 12, opacity: 0.8 }}>{m.user_id}</span>
                          <div>{m.content}</div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="actions" style={{ marginTop: 12 }}>
                    <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje" style={{ flex: 1 }} />
                    <button className="btn" type="button" onClick={async () => {
                      try {
                        await sendMessage(activeRoomId, newMessage)
                        setNewMessage('')
                      } catch (e) {
                        alert(`No se pudo enviar: ${e?.message || e}`)
                      }
                    }}>Enviar</button>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Trips tab: listado y unirse */}
            {tab==='trips' && (
            <div className="card glass-card" style={{ marginTop: 20 }}>
              <h3 className="page-title" style={{ color: '#0284c7' }}>Viajes disponibles</h3>
              <div style={{ marginTop: 12 }}>
                {trips.length === 0 && <p className="muted">No hay viajes aún.</p>}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8 }}>
                  {trips.map((t)=> (
                    <li key={t.id} className="card glass-card" style={{ padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{t.name}</div>
                          <div className="muted">{t.origin || 'Origen ?'} → {t.destination || 'Destino ?'}</div>
                          {t.date && <div className="muted">{new Date(t.date).toLocaleString()}</div>}
                        </div>
                        <div className="actions" style={{ margin: 0 }}>
                          <button className="btn" type="button" onClick={async()=>{
                            try {
                              if (!profile?.user_id) throw new Error('Sin usuario')
                              const { data } = await api.post('/trips/join/', { trip_id: t.id, user_id: profile.user_id })
                              if (data?.ok) {
                                alert('Te uniste al viaje')
                                // refrescar salas del usuario
                                const r = await listRoomsForUser(profile.user_id)
                                setRooms(r)
                              } else {
                                alert(data?.error || 'No se pudo unir al viaje')
                              }
                            } catch (e) {
                              alert(e?.message || 'Error al unirse')
                            }
                          }}>Unirme</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}


