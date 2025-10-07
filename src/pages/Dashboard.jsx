import { useEffect, useState } from 'react'
import { getSession, supabase, updateUserMetadata } from '../services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages, inviteByEmail } from '@/services/chat'
import { api } from '@/services/api'
import { listTrips as fetchTrips, joinTrip, leaveTrip } from '@/services/trips'
import { applyToTrip, respondToApplication, getUserApplications } from '@/services/applications'
import ApplyToTripModal from '@/components/ApplyToTripModal'
import TripFilters from '@/components/TripFilters'
import TripGrid from '@/components/TripGrid'
import DashboardLayout from '@/components/DashboardLayout'
import GlassCard from '@/components/GlassCard'
import ProfileCard from '@/components/ProfileCard'
import ChatsCard from '@/components/ChatsCard'
import NotificationCenter from '@/components/NotificationCenter'
import { upsertProfileToBackend } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function Dashboard() {
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  
  const [trip, setTrip] = useState({
    name: '',
    origin: '',
    destination: '',
    startDate: '',
    endDate: '',
    budgetMin: '',
    budgetMax: '',
    status: '',
    roomType: '',
    season: '',
    country: '',
    maxParticipants: ''
  })
  const [tab, setTab] = useState('chats')
  const [tripsBase, setTripsBase] = useState([])
  const [trips, setTrips] = useState([])
  const [showMineOnly, setShowMineOnly] = useState(false)
  const [visibleCount, setVisibleCount] = useState(6)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [editTripModal, setEditTripModal] = useState({ open: false, data: null })
  const [joiningId, setJoiningId] = useState(null)
  const [leavingId, setLeavingId] = useState(null)
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [userNames, setUserNames] = useState({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [unsub, setUnsub] = useState(null)
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const navigate = useNavigate()
  const location = useLocation()
  const budgetTrips = trips.filter((t) => t && (t.budgetMin != null || t.budgetMax != null))
  const section = (location.hash || '#inicio').replace('#', '')
  const [showCreate, setShowCreate] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  // Expenses state (local, per user)
  const [expensesTripId, setExpensesTripId] = useState('')
  const storageKey = (suffix) => `exp_${suffix}_${expensesTripId || 'global'}`
  const [participants, setParticipants] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey('participants')) || '[]') } catch { return [] }
  })
  const [expenses, setExpenses] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey('expenses')) || '[]') } catch { return [] }
  })
  const [participantsMode, setParticipantsMode] = useState('manual')
  const [participantsTripId, setParticipantsTripId] = useState('')
  const [splitMode, setSplitMode] = useState('all')
  const [splitSelected, setSplitSelected] = useState([])
  const [joinDialog, setJoinDialog] = useState({ open: false, title: '', message: '' })
  const [applyModal, setApplyModal] = useState({ open: false, trip: null })
  const [applicationStatuses, setApplicationStatuses] = useState({})
  const [applicationOrganizer, setApplicationOrganizer] = useState({})
  const [userApplications, setUserApplications] = useState([])

  // Autocomplete state for country and cities
  const [isoCountry, setIsoCountry] = useState('')
  const [countryQuery, setCountryQuery] = useState('')
  const [countrySuggestions, setCountrySuggestions] = useState([])
  const [originQuery, setOriginQuery] = useState('')
  const [originSuggestions, setOriginSuggestions] = useState([])
  const [destinationQuery, setDestinationQuery] = useState('')
  const [destinationSuggestions, setDestinationSuggestions] = useState([])

  // Simple debounce helper
  function debounce(fn, delay) {
    let t
    return (...args) => {
      clearTimeout(t)
      t = setTimeout(() => fn(...args), delay)
    }
  }

  // Fetch countries from Nominatim
  const fetchCountries = useState(() => debounce(async (q) => {
    try {
      if (!q || q.length < 3) { setCountrySuggestions([]); return }
      const url = `https://nominatim.openstreetmap.org/search?country=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      setCountrySuggestions(Array.isArray(data) ? data : [])
    } catch { setCountrySuggestions([]) }
  }, 350))[0]

  // Fetch cities filtered by isoCountry
  const fetchCities = useState(() => debounce(async (q, which) => {
    try {
      if (!q || q.length < 3) {
        if (which === 'origin') setOriginSuggestions([])
        else setDestinationSuggestions([])
        return
      }
      let url = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=5`
      if (isoCountry) url += `&countrycodes=${encodeURIComponent(isoCountry)}`
      const res = await fetch(url, { headers: { 'Accept-Language': 'es' } })
      const data = await res.json()
      if (which === 'origin') setOriginSuggestions(Array.isArray(data) ? data : [])
      else setDestinationSuggestions(Array.isArray(data) ? data : [])
    } catch {
      if (which === 'origin') setOriginSuggestions([])
      else setDestinationSuggestions([])
    }
  }, 350))[0]

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
            // Deep-link: open chat from query param (?trip= or ?room=)
            try {
              const search = new URLSearchParams(window.location.search)
              const roomParam = search.get('room')
              const tripParam = search.get('trip')
              if (roomParam) {
                const room = (r || []).find((x) => String(x.id) === String(roomParam))
                if (room) await openRoom(room)
              } else if (tripParam) {
                const room = (r || []).find((x) => String(x.trip_id) === String(tripParam))
                if (room) await openRoom(room)
              }
            } catch {}
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
    loadUserApplications()
  }, [])

  useEffect(() => {
    try { localStorage.setItem(storageKey('participants'), JSON.stringify(participants)) } catch {}
  }, [participants, expensesTripId])
  useEffect(() => {
    try { localStorage.setItem(storageKey('expenses'), JSON.stringify(expenses)) } catch {}
  }, [expenses, expensesTripId])
  useEffect(() => {
    // Load persisted when changing selected expenses trip
    try {
      const p = JSON.parse(localStorage.getItem(storageKey('participants')) || '[]')
      setParticipants(Array.isArray(p) ? p : [])
    } catch { setParticipants([]) }
    try {
      const e = JSON.parse(localStorage.getItem(storageKey('expenses')) || '[]')
      setExpenses(Array.isArray(e) ? e : [])
    } catch { setExpenses([]) }
  }, [expensesTripId])

  // Keep split selection in sync with participants and mode
  useEffect(() => {
    if (splitMode === 'all') {
      setSplitSelected(participants)
    } else {
      setSplitSelected((prev) => prev.filter((p) => participants.includes(p)))
    }
  }, [participants, splitMode])

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

  async function loadUserApplications() {
    try {
      const data = await getUserApplications()
      setUserApplications(data || [])
    } catch (e) {
      console.error('Error loading user applications:', e)
    }
  }

  function hasUserAppliedToTrip(tripId) {
    return userApplications.some(app => 
      String(app.trip) === String(tripId) && 
      app.status === 'pending'
    )
  }

  // Scan messages and sync application statuses from Supabase
  async function updateApplicationStatusesFromMessages(msgs) {
    try {
      const statusMap = {}
      const ids = []
      for (const m of (msgs || [])) {
        const c = m?.content
        if (typeof c === 'string' && c.startsWith('APP_STATUS|')) {
          const parts = c.split('|')
          const id = parts[1]
          const st = parts[2]
          if (id && st) statusMap[String(id)] = String(st)
        } else if (typeof c === 'string' && c.startsWith('APP|')) {
          const id = c.split('|')[1]
          if (id) ids.push(String(id))
        }
      }
      if (Object.keys(statusMap).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...statusMap }))
      }
      const uniqueIds = Array.from(new Set(ids))
      if (uniqueIds.length === 0) return
      const { data, error } = await supabase
        .from('applications')
        .select('id,status')
        .in('id', uniqueIds)
      if (error) return
      const map = {}
      for (const row of data || []) {
        if (row?.id && row?.status) map[String(row.id)] = String(row.status)
      }
      if (Object.keys(map).length > 0) setApplicationStatuses((prev) => ({ ...prev, ...map }))
    } catch {}
  }

  // Open a room and load/subscribe messages
  const openRoom = async (room) => {
    try {
      const roomId = room?.id
      if (!roomId) return
      setActiveRoomId(roomId)
      setActiveRoom(room || null)
      window.location.hash = '#chats'
      const initial = await fetchMessages(roomId)
      setMessages(initial)
      await updateApplicationStatusesFromMessages(initial)
      await resolveNamesForMessages(initial)
      // Pre-resolve organizer permission for application actions
      try {
        if (room?.application_id) {
          const { data: appRows } = await supabase.from('applications').select('trip_id').eq('id', room.application_id).limit(1)
          const tripId = (appRows || [])[0]?.trip_id
          if (tripId) {
            const { data: tripRows } = await supabase.from('trips').select('creator_id').eq('id', tripId).limit(1)
            const organizerId = (tripRows || [])[0]?.creator_id
            setApplicationOrganizer((prev) => ({ ...prev, [room.application_id]: String(organizerId) === String(profile?.user_id) }))
          }
        }
      } catch {}
      if (unsub) {
        try { unsub() } catch {}
      }
      const unsubscribe = subscribeToRoomMessages(roomId, (msg) => {
        setMessages((prev) => [...prev, msg])
        updateApplicationStatusesFromMessages([msg])
        resolveNamesForMessages([msg])
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

  const getSenderLabel = (m) => {
    const uid = m?.user_id || ''
    if (profile?.user_id && uid === profile.user_id) return 'Tú'
    const name = userNames[uid]
    if (name) return name
    return 'Usuario'
  }

  // Resolve and cache sender names from Supabase public.User by userid
  async function resolveNamesForMessages(msgs) {
    try {
      const ids = Array.from(new Set((msgs || []).map((m) => m.user_id).filter((id) => id && id !== profile?.user_id)))
      const missing = ids.filter((id) => !userNames[id])
      if (missing.length === 0) return
      const { data, error } = await supabase
        .from('User')
        .select('userid,nombre,apellido')
        .in('userid', missing)
      if (error) return
      const map = {}
      for (const row of data || []) {
        const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && full) map[row.userid] = full
      }
      if (Object.keys(map).length > 0) setUserNames((prev) => ({ ...prev, ...map }))
    } catch {}
  }

  async function fetchNamesForUserIds(ids) {
    const uniq = Array.from(new Set(ids.filter(Boolean)))
    if (uniq.length === 0) return {}
    const { data, error } = await supabase
      .from('User')
      .select('userid,nombre,apellido')
      .in('userid', uniq)
    if (error) return {}
    const map = {}
    for (const row of data || []) {
      const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
      if (row?.userid && full) map[row.userid] = full
    }
    return map
  }

  async function loadParticipantsFromTrip() {
    try {
      const tripId = participantsTripId
      if (!tripId) return
      // Load from backend to avoid RLS/view issues and ensure full list
      const res = await api.get('/trips/members/', { params: { trip_id: tripId } })
      const members = Array.isArray(res?.data?.members) ? res.data.members : []
      const ids = members.map((x) => x.user_id)
      if (ids.length === 0) {
        alert('Este viaje no tiene participantes aún')
        return
      }
      // 3) Resolve names
      const map = await fetchNamesForUserIds(ids)
      const names = members.map((m) => {
        const id = m.user_id
        if (profile?.user_id && id === profile.user_id) {
          if (profile?.meta?.first_name && profile?.meta?.last_name) return `${profile.meta.first_name} ${profile.meta.last_name}`
          return 'Tú'
        }
        return m.name || map[id] || id
      })
      setParticipants(Array.from(new Set(names)))
      setExpensesTripId(tripId)
    } catch (e) {
      alert('No se pudieron cargar participantes del viaje')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 text-white">
        {error && <pre className="error">{error}</pre>}
        {!error && !profile && <p className="muted">Cargando…</p>}
        {profile && (
          <>
            {section === 'inicio' && (
              <div id="inicio" className="mb-2">
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
                  <div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold mb-2">
                      Bienvenido{profile?.meta?.first_name ? (
                        <span className="bg-gradient-to-r from-blue-500 to-green-500 bg-clip-text text-transparent">{`, ${profile.meta.first_name}`}</span>
                      ) : ''}
                    </h1>
                    <p className="muted mb-4">Aquí está tu resumen de viajes</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                      <div className="glass-card p-4 min-h-[88px] flex flex-col justify-center">
                        <div className="text-xs text-slate-400">Mis viajes</div>
                        <div className="text-2xl sm:text-3xl font-extrabold">{tripsBase.length}</div>
                      </div>
                      <div className="glass-card p-4 min-h-[88px] flex flex-col justify-center">
                        <div className="text-xs text-slate-400">Chats</div>
                        <div className="text-2xl sm:text-3xl font-extrabold">{rooms.length}</div>
                      </div>
                      <div className="glass-card p-4 min-h-[88px] flex flex-col justify-center">
                        <div className="text-xs text-slate-400">Gastos guardados</div>
                        <div className="text-2xl sm:text-3xl font-extrabold">{expenses.length}</div>
                      </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
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
                  <NotificationCenter />
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="glass-card md:col-span-1" style={{ padding: 12, display: 'grid', gap: 12 }}>
                    <div>
                      <h3 className="page-title" style={{ color: '#60a5fa', marginBottom: 8 }}>Chats de Viajes</h3>
                      <ChatsCard
                        title="Chats de Viajes"
                        rooms={(rooms || []).filter((r) => !(r.is_private === true || r.application_id))}
                        onOpen={openRoom}
                      />
                    </div>
                    <div>
                      <h3 className="page-title" style={{ color: '#60a5fa', marginBottom: 8 }}>Chats privados</h3>
                      <ChatsCard
                        title="Chats privados"
                        rooms={(rooms || []).filter((r) => (r.is_private === true || r.application_id))}
                        onOpen={openRoom}
                      />
                    </div>
                  </div>
                  <div className="glass-card md:col-span-2" style={{ padding: 12, minHeight: 360, display: 'flex', flexDirection: 'column' }}>
                    {!activeRoomId && (
                      <p className="muted">Seleccioná un chat para comenzar</p>
                    )}
                    {activeRoomId && (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{activeRoom?.display_name || activeRoom?.name || 'Chat'}</div>
                          <button
                              className="btn secondary"
                              style={{ height: 28, padding: '0 10px' }}
                              onClick={async () => {
                                try {
                                  // Chats privados: resolver miembros por room_id y mapear nombres
                                  if (activeRoom?.is_private || activeRoom?.application_id) {
                                    const roomId = activeRoom?.id
                                    if (!roomId) { alert('Sala no válida'); return }
                                    const { data: mems } = await supabase
                                      .from('chat_members')
                                      .select('user_id')
                                      .eq('room_id', roomId)
                                    const ids = Array.from(new Set((mems || []).map((m) => m.user_id).filter(Boolean)))
                                    const nameMap = await fetchNamesForUserIds(ids)
                                    const members = ids.map((id) => ({
                                      user_id: id,
                                      name: (profile?.user_id && id === profile.user_id)
                                        ? (profile?.meta?.first_name && profile?.meta?.last_name ? `${profile.meta.first_name} ${profile.meta.last_name}` : 'Tú')
                                        : (nameMap[id] || 'Usuario')
                                    }))
                                    setChatMembers(members)
                                    setChatInfoOpen(true)
                                    return
                                  }

                                  // Chats de viaje: usar backend y completar nombres faltantes
                                  const tripId = activeRoom?.trip_id
                                  if (!tripId) {
                                    alert('No se pueden cargar integrantes: falta el trip_id asociado a esta sala')
                                    return
                                  }
                                  const res = await api.get('/trips/members/', { params: { trip_id: tripId } })
                                  const rawMembers = Array.isArray(res?.data?.members) ? res.data.members : []
                                  const ids = Array.from(new Set(rawMembers.map((m) => m.user_id).filter(Boolean)))
                                  const nameMap = await fetchNamesForUserIds(ids)
                                  const members = rawMembers.map((m) => {
                                    const id = m.user_id
                                    let name = m.name || nameMap[id]
                                    if (!name) {
                                      if (profile?.user_id && id === profile.user_id) {
                                        name = (profile?.meta?.first_name && profile?.meta?.last_name) ? `${profile.meta.first_name} ${profile.meta.last_name}` : 'Tú'
                                      } else {
                                        name = 'Usuario'
                                      }
                                    }
                                    return { user_id: id, name }
                                  })
                                  setChatMembers(members)
                                  setChatInfoOpen(true)
                                } catch (e) {
                                  alert('No se pudieron cargar los integrantes')
                                }
                              }}
                            >
                              Ver información
                            </button>
                        </div>
                        <div style={{ flex: 1, overflow: 'auto', paddingRight: 8 }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {messages.map((m) => {
                              const isApp = typeof m?.content === 'string' && m.content.startsWith('APP|')
                              const isAppStatus = typeof m?.content === 'string' && m.content.startsWith('APP_STATUS|')
                              let applicationId = null
                              let displayContent = m?.content || ''
                              if (isApp) {
                                const parts = displayContent.split('|')
                                applicationId = parts[1]
                                displayContent = parts.slice(2).join('|')
                              } else if (isAppStatus) {
                                // Render-only; actual status sync happens in updateApplicationStatusesFromMessages
                                displayContent = ''
                              }
                              return (
                                <div key={m.id} className="glass-card" style={{ padding: 8 }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{getSenderLabel(m)}</div>
                                  {displayContent && <div style={{ fontSize: 13 }}>{displayContent}</div>}
                                  {(() => {
                                    try {
                                      const isPrivate = !!(activeRoom?.is_private || activeRoom?.application_id)
                                      let isOrganizer = false
                                      if (isPrivate && activeRoom?.application_id) {
                                        try {
                                          const cached = applicationOrganizer[activeRoom.application_id]
                                          if (typeof cached === 'boolean') {
                                            isOrganizer = cached
                                          } else {
                                            // Resolve without await in render: pre-resolve organizer in effect on open
                                            isOrganizer = false
                                          }
                                        } catch {}
                                      }
                                      const status = applicationStatuses[applicationId]
                                      const isFinal = status === 'accepted' || status === 'rejected'
                                      if (isApp && applicationId && isFinal) {
                                        return (
                                          <div style={{ marginTop: 8, fontWeight: 600, color: status === 'accepted' ? '#22c55e' : '#ef4444' }}>
                                            {status === 'accepted' ? 'Ya se ha aceptado la solicitud' : 'Ya se ha rechazado la solicitud'}
                                          </div>
                                        )
                                      }
                                      if (isPrivate && isOrganizer && isApp && applicationId && !isFinal) {
                                        return (
                                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                            <button
                                              className="btn"
                                              style={{ height: 32, padding: '0 10px', background: '#ef4444' }}
                                              onClick={async () => {
                                                try { await respondToApplication(applicationId, 'reject'); setApplicationStatuses((prev) => ({ ...prev, [applicationId]: 'rejected' })) } catch (e) { alert(e?.response?.data?.error || e?.message || 'No se pudo rechazar') }
                                              }}
                                            >
                                              Rechazar
                                            </button>
                                            <button
                                              className="btn"
                                              style={{ height: 32, padding: '0 10px', background: '#22c55e' }}
                                              onClick={async () => {
                                                try { await respondToApplication(applicationId, 'accept'); setApplicationStatuses((prev) => ({ ...prev, [applicationId]: 'accepted' })) } catch (e) { alert(e?.response?.data?.error || e?.message || 'No se pudo aceptar') }
                                              }}
                                            >
                                              Aceptar
                                            </button>
                                          </div>
                                        )
                                      }
                                    } catch {}
                                    return null
                                  })()}
                                  <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{new Date(m.created_at).toLocaleString()}</div>
                                </div>
                              )
                            })}
                            {messages.length === 0 && <p className="muted">No hay mensajes aún.</p>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center' }}>
                          <Input
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={(e) => {
                              try {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleSend()
                                }
                              } catch {}
                            }}
                            placeholder="Escribí un mensaje..."
                            className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
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
              <section id="trips" className="glass-card mt-4">
                <div className="grid place-items-center">
                  <h3 className="page-title text-blue-400 m-0 text-center">
                    {showMineOnly ? 'Mis Viajes' : 'Viajes Disponibles'}
                  </h3>
                </div>
                <div className="mt-3">
                  {trips.length === 0 && <p className="muted mt-3 text-center">No hay viajes que coincidan.</p>}
                  <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 items-start">
                    {/* Botones del lado izquierdo */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:gap-3 w-full lg:w-auto lg:min-w-fit">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setShowMineOnly(false)
                          setTrips(tripsBase || [])
                          setVisibleCount(6)
                        }}
                      >
                        Viajes disponibles
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          const mine = (tripsBase || []).filter((t) => t.creatorId && t.creatorId === profile?.user_id)
                          setTrips(mine)
                          setShowMineOnly(true)
                          setVisibleCount(6)
                        }}
                      >
                        Mis viajes
                      </Button>
                    </div>
                    
                    {/* Grid de viajes */}
                    <div className="flex-1 w-full">
                      <TripGrid
                        trips={(showMineOnly ? trips : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id))).slice(0, visibleCount)}
                        joiningId={joiningId}
                        leavingId={leavingId}
                        onJoin={async (t) => {
                          // Deprecated join path; use apply flow instead
                          setApplyModal({ open: true, trip: t })
                        }}
                        onApply={(t) => setApplyModal({ open: true, trip: t })}
                        onLeave={async (t) => {
                          try {
                            if (!profile?.user_id) throw new Error('Sin usuario')
                            const confirmMsg = (t.creatorId && t.creatorId === profile.user_id)
                              ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                              : '¿Seguro que querés abandonar este viaje?'
                            if (!confirm(confirmMsg)) return
                            setLeavingId(t.id)
                            const data = await leaveTrip(t.id, profile.user_id)
                            if (data?.ok !== false) {
                              await loadTrips()
                              // refrescar salas de chat por si cambió membresía o se eliminó
                              try { const r = await listRoomsForUser(profile.user_id); setRooms(r) } catch {}
                              setJoinDialog({ open: true, title: (t.creatorId && t.creatorId === profile.user_id) ? 'Viaje eliminado' : 'Saliste del viaje', message: (t.creatorId && t.creatorId === profile.user_id) ? 'Se eliminó el viaje y su chat.' : 'Ya no sos parte del viaje.' })
                            } else {
                              alert(data?.error || 'No se pudo abandonar/eliminar el viaje')
                            }
                          } catch (e) {
                            alert(e?.message || 'Error al abandonar/eliminar')
                          } finally {
                            setLeavingId(null)
                          }
                        }}
                        onEdit={(t) => { setEditTripModal({ open: true, data: t }) }}
                        canEdit={(t) => t.creatorId && t.creatorId === profile?.user_id}
                        isMemberFn={(t) => {
                          try {
                            return Array.isArray(rooms) && rooms.some((r) => (
                              String(r?.trip_id) === String(t.id) && (r?.is_group === true || (!r?.is_private && !r?.application_id))
                            ))
                          } catch { return false }
                        }}
                        isOwnerFn={(t) => t.creatorId && t.creatorId === profile?.user_id}
                        hasAppliedFn={(t) => hasUserAppliedToTrip(t.id)}
                      />
                    </div>
                    
                    {/* Botones del lado derecho */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 'fit-content' }}>
                      <Button variant="secondary" onClick={() => { setShowMineOnly(false); setFiltersOpen(true) }}>Filtrar</Button>
                      <Button onClick={() => setShowCreateModal(true)} className="btn sky">Crear viaje</Button>
                    </div>
                  </div>
                  {(() => { const list = showMineOnly ? trips : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id)); return list.length > 0 })() && visibleCount < (showMineOnly ? trips.length : trips.filter((t) => !(t.creatorId && t.creatorId === profile?.user_id))).length && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                      <Button onClick={() => setVisibleCount((v) => v + 6)}>Cargar más</Button>
                    </div>
                  )}
                </div>
              </section>
            )}

            {section === 'expenses' && (
              <section id="expenses" className="glass-card" style={{ marginTop: 16 }}>
                <h3 className="page-title" style={{ color: '#60a5fa' }}>Gastos</h3>
                <div style={{ marginTop: 12, display: 'grid', gap: 12 }}>
                  <div className="glass-card" style={{ padding: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Participantes</h4>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <label style={{ fontSize: 14 }}>Origen:</label>
                      <select value={participantsMode} onChange={(e) => setParticipantsMode(e.target.value)}>
                        <option value="manual">Manual</option>
                        <option value="trip">Desde viaje</option>
                      </select>
                      {participantsMode === 'trip' && (
                        <>
                          <select value={participantsTripId} onChange={(e) => setParticipantsTripId(e.target.value)}>
                            <option value="">Seleccioná un viaje</option>
                            {(tripsBase || []).map((t) => (
                              <option key={t.id} value={t.id}>{t.name || t.destination}</option>
                            ))}
                          </select>
                          <Button onClick={loadParticipantsFromTrip}>Cargar</Button>
                        </>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {participants.map((p, idx) => (
                        <span key={idx} className="btn" style={{ height: 32, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          {p}
                          <button
                            type="button"
                            aria-label={`Quitar ${p}`}
                            className="btn secondary"
                            style={{ height: 24, padding: '0 8px' }}
                            onClick={() => setParticipants((prev) => prev.filter((x) => x !== p))}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Input id="new_participant" placeholder="Nombre" className="flex-1 bg-slate-700 border-slate-600 text-white placeholder-slate-400" />
                      <Button onClick={() => {
                        const input = document.getElementById('new_participant')
                        const v = (input?.value || '').trim()
                        if (!v) return
                        setParticipants((prev) => Array.from(new Set([...prev, v])))
                        if (input) input.value = ''
                      }}>Agregar</Button>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Nuevo gasto</h4>
                    <div className="form" style={{ gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                      <div className="field">
                        <label>Descripción</label>
                        <input id="exp_desc" placeholder="Ej: Cena" />
                      </div>
                      <div className="field">
                        <label>Monto</label>
                        <input id="exp_amount" type="number" inputMode="numeric" placeholder="0" />
                      </div>
                      <div className="field">
                        <label>Pagado por</label>
                        <select id="exp_paid_by" defaultValue="">
                          <option value="">Seleccioná</option>
                          {participants.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="field" style={{ marginTop: 8 }}>
                      <label>Dividir entre</label>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="radio"
                            name="split_mode"
                            checked={splitMode === 'all'}
                            onChange={() => setSplitMode('all')}
                          />
                          Todos
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <input
                            type="radio"
                            name="split_mode"
                            checked={splitMode === 'custom'}
                            onChange={() => setSplitMode('custom')}
                          />
                          Personalizado
                        </label>
                        {splitMode === 'all' && participants.length > 0 && (
                          <button type="button" className="btn secondary" style={{ height: 32 }} onClick={() => setSplitSelected(participants)}>Marcar todos</button>
                        )}
                      </div>
                      {splitMode === 'custom' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginTop: 8 }}>
                          {participants.map((p) => (
                            <label key={p} className="glass-card" style={{ padding: 8, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <input
                                type="checkbox"
                                checked={splitSelected.includes(p)}
                                onChange={(e) => {
                                  if (e.target.checked) setSplitSelected((prev) => Array.from(new Set([...prev, p])))
                                  else setSplitSelected((prev) => prev.filter((x) => x !== p))
                                }}
                              />
                              <span>{p}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="actions">
                      <Button onClick={() => {
                        const desc = document.getElementById('exp_desc')?.value || ''
                        const amount = Number(document.getElementById('exp_amount')?.value || '0')
                        const paidBy = document.getElementById('exp_paid_by')?.value || ''
                        if (!desc.trim() || !amount || !paidBy) return alert('Completá descripción, monto y pagador')
                        const people = splitMode === 'all' ? participants : splitSelected
                        if (!people || people.length === 0) return alert('Agregá participantes')
                        setExpenses((prev) => [...prev, { id: Date.now(), desc, amount, paidBy, between: people }])
                        try { document.getElementById('exp_desc').value = '' } catch {}
                        try { document.getElementById('exp_amount').value = '' } catch {}
                        try { document.getElementById('exp_paid_by').value = '' } catch {}
                        setSplitMode('all')
                      }}>Agregar gasto</Button>
                    </div>
                  </div>

                  <div className="glass-card" style={{ padding: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Gastos</h4>
                    {(expenses || []).length === 0 && <p className="muted">Sin gastos aún</p>}
                    {(expenses || []).length > 0 && (
                      <div style={{ display: 'grid', gap: 8 }}>
                        {expenses.map((e) => (
                          <div key={e.id} className="glass-card" style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ fontWeight: 600 }}>{e.desc}</div>
                              <div className="muted" style={{ fontSize: 12 }}>Pagó {e.paidBy} · dividido entre {e.between.length}</div>
                            </div>
                            <div style={{ fontWeight: 700 }}>${e.amount}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="glass-card" style={{ padding: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Balances</h4>
                    {(() => {
                      const balances = {}
                      for (const p of participants) balances[p] = 0
                      for (const e of expenses) {
                        const share = e.amount / (e.between.length || 1)
                        for (const p of e.between) balances[p] -= share
                        balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount
                      }
                      const entries = Object.entries(balances)
                      if (entries.length === 0) return <p className="muted">Sin balances</p>
                      return (
                        <div style={{ display: 'grid', gap: 4 }}>
                          {entries.map(([p, v]) => (
                            <div key={p} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>{p}</span>
                              <span style={{ color: v >= 0 ? '#22c55e' : '#ef4444' }}>{v >= 0 ? '+' : ''}${v.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>

                  <div className="glass-card" style={{ padding: 12 }}>
                    <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Sugerencias de saldos</h4>
                    {(() => {
                      const balances = {}
                      for (const p of participants) balances[p] = 0
                      for (const e of expenses) {
                        const share = e.amount / (e.between.length || 1)
                        for (const p of e.between) balances[p] -= share
                        balances[e.paidBy] = (balances[e.paidBy] || 0) + e.amount
                      }
                      const debtors = Object.entries(balances).filter(([, v]) => v < 0).map(([p, v]) => ({ p, v }))
                      const creditors = Object.entries(balances).filter(([, v]) => v > 0).map(([p, v]) => ({ p, v }))
                      debtors.sort((a, b) => a.v - b.v)
                      creditors.sort((a, b) => b.v - a.v)
                      const transfers = []
                      let i = 0, j = 0
                      while (i < debtors.length && j < creditors.length) {
                        const need = -debtors[i].v
                        const avail = creditors[j].v
                        const pay = Math.min(need, avail)
                        if (pay > 0.005) transfers.push(`${debtors[i].p} → ${creditors[j].p}: $${pay.toFixed(2)}`)
                        debtors[i].v += pay
                        creditors[j].v -= pay
                        if (Math.abs(debtors[i].v) < 0.005) i++
                        if (Math.abs(creditors[j].v) < 0.005) j++
                      }
                      if (transfers.length === 0) return <p className="muted">No hay deudas pendientes</p>
                      return (
                        <div style={{ display: 'grid', gap: 4 }}>
                          {transfers.map((t, idx) => (
                            <div key={idx}>{t}</div>
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showCreateModal && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="createTripTitle">
          <div className="overlay-box" style={{ maxWidth: 840, width: '95%' }}>
            <h3 id="createTripTitle" className="page-title" style={{ margin: 0, color: '#60a5fa' }}>Crear viaje</h3>
            <div className="glass-card" style={{ padding: 16, marginTop: 8, background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, position: 'relative' }}>
                <div className="field">
                  <label>Nombre</label>
                  <input value={trip.name} onChange={(e) => setTrip({ ...trip, name: e.target.value })} placeholder="Ej: Bariloche 2025" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>Origen</label>
                  <input
                    value={trip.origin}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, origin: v })
                      setOriginQuery(v)
                      fetchCities(v, 'origin')
                    }}
                    placeholder="Ciudad de origen"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {originSuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {originSuggestions.map((item, idx) => (
                        <li
                          key={`o_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            setTrip((t) => ({ ...t, origin: item.display_name }))
                            setOriginQuery(item.display_name)
                            setOriginSuggestions([])
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setTrip((t) => ({ ...t, origin: item.display_name })); setOriginSuggestions([]) } }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>Destino</label>
                  <input
                    value={trip.destination}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, destination: v })
                      setDestinationQuery(v)
                      fetchCities(v, 'destination')
                    }}
                    placeholder="Ciudad de destino"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {destinationSuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {destinationSuggestions.map((item, idx) => (
                        <li
                          key={`d_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            setTrip((t) => ({ ...t, destination: item.display_name }))
                            setDestinationQuery(item.display_name)
                            setDestinationSuggestions([])
                          }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { setTrip((t) => ({ ...t, destination: item.display_name })); setDestinationSuggestions([]) } }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="field">
                  <label>Desde</label>
                  <input type="date" value={trip.startDate} onChange={(e) => setTrip({ ...trip, startDate: e.target.value })} min={new Date().toISOString().split('T')[0]} style={{ color: '#e5e7eb', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input type="date" value={trip.endDate} onChange={(e) => setTrip({ ...trip, endDate: e.target.value })} min={new Date().toISOString().split('T')[0]} style={{ color: '#e5e7eb', background: 'rgba(255,255,255,0.06)' }} />
                </div>
                <div className="field">
                  <label>Presupuesto mín.</label>
                  <input type="number" inputMode="numeric" value={trip.budgetMin} onChange={(e) => setTrip({ ...trip, budgetMin: e.target.value })} placeholder="0" min="0" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field">
                  <label>Presupuesto máx.</label>
                  <input type="number" inputMode="numeric" value={trip.budgetMax} onChange={(e) => setTrip({ ...trip, budgetMax: e.target.value })} placeholder="9999" min="0" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field">
                  <label>Cantidad de personas (máx.)</label>
                  <input type="number" inputMode="numeric" value={trip.maxParticipants} onChange={(e) => setTrip({ ...trip, maxParticipants: e.target.value })} placeholder="2" style={{ color: '#e5e7eb' }} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select value={trip.status} onChange={(e) => setTrip({ ...trip, status: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="active">Activo</option>
                    <option value="upcoming">Próximo</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Habitación</label>
                  <select value={trip.roomType} onChange={(e) => setTrip({ ...trip, roomType: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="shared">Compartida</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <div className="field">
                  <label>Temporada</label>
                  <select value={trip.season} onChange={(e) => setTrip({ ...trip, season: e.target.value })} style={{ color: '#111827', background: '#ffffff' }}>
                    <option value="">-</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="autumn">Otoño</option>
                    <option value="winter">Invierno</option>
                    <option value="any">Cualquiera</option>
                  </select>
                </div>
                <div className="field" style={{ position: 'relative' }}>
                  <label>País</label>
                  <input
                    value={trip.country}
                    onChange={(e) => {
                      const v = e.target.value
                      setTrip({ ...trip, country: v })
                      setCountryQuery(v)
                      setIsoCountry('')
                      fetchCountries(v)
                    }}
                    placeholder="Argentina"
                    style={{ color: '#e5e7eb' }}
                    autoComplete="off"
                  />
                  {countrySuggestions.length > 0 && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, border: '1px solid #334155', background: '#0f172a', position: 'absolute', zIndex: 20, width: '100%', maxHeight: 180, overflow: 'auto' }}>
                      {countrySuggestions.map((item, idx) => (
                        <li
                          key={`c_${idx}_${item.place_id}`}
                          style={{ padding: 6, cursor: 'pointer' }}
                          onClick={() => {
                            const label = item.display_name
                            const code = (item.address && item.address.country_code ? String(item.address.country_code).toUpperCase() : '')
                            setTrip((t) => ({ ...t, country: label }))
                            setIsoCountry(code)
                            setCountrySuggestions([])
                            // Clear city suggestions upon choosing country
                            setOriginSuggestions([])
                            setDestinationSuggestions([])
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const label = item.display_name
                              const code = (item.address && item.address.country_code ? String(item.address.country_code).toUpperCase() : '')
                              setTrip((t) => ({ ...t, country: label }))
                              setIsoCountry(code)
                              setCountrySuggestions([])
                            }
                          }}
                          tabIndex={0}
                        >
                          {item.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                  {isoCountry && (
                    <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Código país: {isoCountry}</div>
                  )}
                </div>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <Button className="btn secondary" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                <Button
                  onClick={async () => {
                    try {
                      // Try to fetch a destination cover image from Unsplash
                      let imageUrl = null
                      try {
                        const qParts = [trip.destination || '', trip.country || ''].filter(Boolean)
                        const q = qParts.join(' ').trim()
                        if (q.length > 0) {
                          const resp = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&client_id=${encodeURIComponent('3mRQnmdKlbPt4Im-miwXXfGuNIdPAk4OE3tf4G75nG0')}`)
                          if (resp.ok) {
                            const json = await resp.json()
                            const first = (Array.isArray(json?.results) ? json.results : [])[0]
                            imageUrl = first?.urls?.regular || first?.urls?.small || null
                          }
                        }
                      } catch {}
                      // Client-side required validation
                      const required = {
                        name: trip.name,
                        origin: trip.origin,
                        destination: trip.destination,
                        country: trip.country,
                        budgetMin: trip.budgetMin,
                        budgetMax: trip.budgetMax,
                        status: trip.status,
                        roomType: trip.roomType,
                        maxParticipants: trip.maxParticipants,
                      }
                      const missing = Object.entries(required).filter(([k, v]) => v == null || String(v).trim() === '').map(([k]) => k)
                      if (missing.length > 0) {
                        alert(`Completá los campos obligatorios: ${missing.join(', ')}`)
                        return
                      }

                      // Validación de presupuesto
                      const budgetMin = Number(trip.budgetMin)
                      const budgetMax = Number(trip.budgetMax)
                      if (budgetMin < 0) {
                        alert('El presupuesto mínimo no puede ser menor a 0')
                        return
                      }
                      if (budgetMax < 0) {
                        alert('El presupuesto máximo no puede ser menor a 0')
                        return
                      }
                      if (budgetMin > budgetMax) {
                        alert('El presupuesto mínimo no puede ser mayor al máximo')
                        return
                      }

                      // Validación de fechas
                      const today = new Date()
                      today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
                      
                      const startDate = new Date(trip.startDate)
                      const endDate = new Date(trip.endDate)
                      
                      if (startDate < today) {
                        alert('La fecha de inicio no puede ser anterior al día de hoy')
                        return
                      }
                      if (endDate < today) {
                        alert('La fecha de fin no puede ser anterior al día de hoy')
                        return
                      }
                      if (startDate > endDate) {
                        alert('La fecha de inicio no puede ser posterior a la fecha de fin')
                        return
                      }

                      const payload = {
                        name: trip.name,
                        origin: trip.origin,
                        destination: trip.destination,
                        start_date: trip.startDate || null,
                        end_date: trip.endDate || null,
                        budget_min: trip.budgetMin !== '' ? Number(trip.budgetMin) : null,
                        budget_max: trip.budgetMax !== '' ? Number(trip.budgetMax) : null,
                        status: trip.status || null,
                        room_type: trip.roomType || null,
                        season: trip.season || null,
                        country: trip.country || null,
                        max_participants: trip.maxParticipants !== '' ? Number(trip.maxParticipants) : null,
                        image_url: imageUrl || null,
                      creator_id: profile?.user_id || editTripModal.data?.creatorId || editTripModal.data?.creator_id || null,
                      }
                      const { data } = await api.post('/trips/create/', payload)
                      setShowCreateModal(false)
                      setTrip({ name: '', origin: '', destination: '', startDate: '', endDate: '', budgetMin: '', budgetMax: '', status: '', roomType: '', season: '', country: '', maxParticipants: '' })
                      await loadTrips()
                      setJoinDialog({ open: true, title: 'Viaje creado', message: 'Tu viaje fue creado con éxito.' })
                    } catch (e) {
                      alert(e?.response?.data?.error || e?.message || 'No se pudo crear el viaje')
                    }
                  }}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

  {chatInfoOpen && (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="chatInfoTitle">
      <div className="overlay-box" style={{ maxWidth: 600, width: '95%' }}>
        <h3 id="chatInfoTitle" className="page-title" style={{ margin: 0 }}>{activeRoom?.name || 'Información del chat'}</h3>
        <div className="glass-card" style={{ padding: 12, marginTop: 8 }}>
          <h4 style={{ fontWeight: 700, marginBottom: 8 }}>Integrantes</h4>
          {(chatMembers || []).length === 0 && <p className="muted">No se pudieron cargar los integrantes o no hay datos.</p>}
          {(chatMembers || []).length > 0 && (
            <div style={{ display: 'grid', gap: 6 }}>
                  {chatMembers.map((m) => (
                    <button
                      key={m.user_id}
                      type="button"
                      className="glass-card"
                      style={{ padding: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                      onClick={() => {
                        try {
                          if (!m?.user_id) return
                          navigate(`/u/${m.user_id}`)
                        } catch {}
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{m.name || 'Usuario'}</div>
                    </button>
                  ))}
            </div>
          )}
        </div>
        <div className="actions" style={{ justifyContent: 'space-between', marginTop: 12 }}>
          <Button variant="secondary" onClick={() => setChatInfoOpen(false)}>Cerrar</Button>
          {activeRoom?.trip_id && (
            <Button
              onClick={async () => {
                try {
                  const tid = activeRoom?.trip_id
                  if (!tid || !profile?.user_id) return
                  const isOwner = (tripsBase || []).some((t) => String(t.id) === String(tid) && t.creatorId === profile.user_id)
                  const confirmMsg = isOwner
                    ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                    : '¿Seguro que querés abandonar este viaje?'
                  if (!confirm(confirmMsg)) return
                  setLeavingId(tid)
                  const data = await leaveTrip(tid, profile.user_id)
                  if (data?.ok !== false) {
                    setChatInfoOpen(false)
                    setActiveRoomId(null)
                    setActiveRoom(null)
                    setMessages([])
                    try { const r = await listRoomsForUser(profile.user_id); setRooms(r) } catch {}
                    await loadTrips()
                  } else {
                    alert(data?.error || 'No se pudo abandonar/eliminar el viaje')
                  }
                } catch (e) {
                  alert(e?.message || 'Error al abandonar/eliminar')
                } finally {
                  setLeavingId(null)
                }
              }}
            >
              {(() => { const isOwner = activeRoom?.trip_id && (tripsBase || []).some((t) => String(t.id) === String(activeRoom.trip_id) && t.creatorId === profile?.user_id); return leavingId === activeRoom?.trip_id ? (isOwner ? 'Eliminando…' : 'Saliendo…') : (isOwner ? 'Eliminar viaje' : 'Abandonar') })()}
            </Button>
          )}
        </div>
      </div>
    </div>
  )}

      {filtersOpen && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="filtersTitle">
          <div className="overlay-box" style={{ maxWidth: 980, width: '95%', position: 'relative' }}>
            <button
              aria-label="Cerrar"
              onClick={() => setFiltersOpen(false)}
              style={{
                position: 'absolute',
                top: -14,
                right: -14,
                width: 36,
                height: 36,
                borderRadius: 9999,
                background: '#0f172a',
                border: '2px solid #ef4444',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(239,68,68,0.45)'
              }}
            >
              ✕
            </button>
            <div style={{ display: 'grid', placeItems: 'center' }}>
              <h3 id="filtersTitle" className="page-title" style={{ margin: 0, textAlign: 'center' }}>Filtros</h3>
            </div>
            <div style={{ marginTop: 8 }}>
              <TripFilters baseTrips={tripsBase} onFilter={(f) => { setTrips(f); setVisibleCount(6); setShowMineOnly(false) }} onDone={() => setFiltersOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {editTripModal.open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="editTripTitle">
          <div className="overlay-box" style={{ maxWidth: 840, width: '95%' }}>
            <h3 id="editTripTitle" className="page-title" style={{ margin: 0 }}>Editar viaje</h3>
            <div className="glass-card" style={{ padding: 12, marginTop: 8 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="field">
                  <label>Nombre</label>
                  <input defaultValue={editTripModal.data?.name} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, name: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Origen</label>
                  <input defaultValue={editTripModal.data?.origin} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, origin: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Destino</label>
                  <input defaultValue={editTripModal.data?.destination} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, destination: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Desde</label>
                  <input type="date" defaultValue={editTripModal.data?.startDate} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, startDate: e.target.value } }))} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="field">
                  <label>Hasta</label>
                  <input type="date" defaultValue={editTripModal.data?.endDate} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, endDate: e.target.value } }))} min={new Date().toISOString().split('T')[0]} />
                </div>
                <div className="field">
                  <label>Presupuesto mín.</label>
                  <input type="number" inputMode="numeric" defaultValue={editTripModal.data?.budgetMin ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, budgetMin: e.target.value } }))} min="0" />
                </div>
                <div className="field">
                  <label>Presupuesto máx.</label>
                  <input type="number" inputMode="numeric" defaultValue={editTripModal.data?.budgetMax ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, budgetMax: e.target.value } }))} min="0" />
                </div>
                <div className="field">
                  <label>Cantidad de personas (máx.)</label>
                  <input type="number" inputMode="numeric" defaultValue={editTripModal.data?.maxParticipants ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, maxParticipants: e.target.value } }))} />
                </div>
                <div className="field">
                  <label>Estado</label>
                  <select defaultValue={editTripModal.data?.status ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, status: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="active">Activo</option>
                    <option value="upcoming">Próximo</option>
                    <option value="completed">Completado</option>
                  </select>
                </div>
                <div className="field">
                  <label>Habitación</label>
                  <select defaultValue={editTripModal.data?.roomType ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, roomType: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="shared">Compartida</option>
                    <option value="private">Privada</option>
                  </select>
                </div>
                <div className="field">
                  <label>Temporada</label>
                  <select defaultValue={editTripModal.data?.season ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, season: e.target.value } }))}>
                    <option value="">-</option>
                    <option value="spring">Primavera</option>
                    <option value="summer">Verano</option>
                    <option value="autumn">Otoño</option>
                    <option value="winter">Invierno</option>
                    <option value="any">Cualquiera</option>
                  </select>
                </div>
                <div className="field">
                  <label>País</label>
                  <input defaultValue={editTripModal.data?.country ?? ''} onChange={(e) => setEditTripModal((m) => ({ ...m, data: { ...m.data, country: e.target.value } }))} />
                </div>
              </div>
              <div className="actions" style={{ justifyContent: 'flex-end' }}>
                <Button className="btn secondary" variant="secondary" onClick={() => setEditTripModal({ open: false, data: null })}>Cancelar</Button>
                <Button onClick={async () => {
                  try {
                    const editedId = editTripModal.data?.id
                    const fallbackCreator = (() => {
                      try { return (tripsBase || []).find((t) => String(t.id) === String(editedId))?.creatorId || null } catch { return null }
                    })()
                    const payload = {
                      id: editedId,
                      name: editTripModal.data?.name,
                      origin: editTripModal.data?.origin,
                      destination: editTripModal.data?.destination,
                      start_date: editTripModal.data?.startDate || null,
                      end_date: editTripModal.data?.endDate || null,
                      budget_min: editTripModal.data?.budgetMin !== '' ? Number(editTripModal.data?.budgetMin) : null,
                      budget_max: editTripModal.data?.budgetMax !== '' ? Number(editTripModal.data?.budgetMax) : null,
                      status: editTripModal.data?.status || null,
                      room_type: editTripModal.data?.roomType || null,
                      season: editTripModal.data?.season || null,
                      country: editTripModal.data?.country || null,
                      max_participants: editTripModal.data?.maxParticipants !== '' ? Number(editTripModal.data?.maxParticipants) : null,
                      creator_id: profile?.user_id || editTripModal.data?.creatorId || editTripModal.data?.creator_id || fallbackCreator || null,
                    }
                    if (!payload.id) { alert('Falta id del viaje para actualizar'); return }
                    if (!payload.creator_id) { alert('Falta creator_id para actualizar este viaje'); return }

                    // Validación de presupuesto
                    const budgetMin = Number(editTripModal.data?.budgetMin || 0)
                    const budgetMax = Number(editTripModal.data?.budgetMax || 0)
                    if (budgetMin < 0) {
                      alert('El presupuesto mínimo no puede ser menor a 0')
                      return
                    }
                    if (budgetMax < 0) {
                      alert('El presupuesto máximo no puede ser menor a 0')
                      return
                    }
                    if (budgetMin > budgetMax) {
                      alert('El presupuesto mínimo no puede ser mayor al máximo')
                      return
                    }

                    // Validación de fechas
                    const today = new Date()
                    today.setHours(0, 0, 0, 0) // Resetear horas para comparar solo fechas
                    
                    const startDate = new Date(editTripModal.data?.startDate)
                    const endDate = new Date(editTripModal.data?.endDate)
                    
                    if (startDate < today) {
                      alert('La fecha de inicio no puede ser anterior al día de hoy')
                      return
                    }
                    if (endDate < today) {
                      alert('La fecha de fin no puede ser anterior al día de hoy')
                      return
                    }
                    if (startDate > endDate) {
                      alert('La fecha de inicio no puede ser posterior a la fecha de fin')
                      return
                    }
                    await api.post('/trips/update/', payload)
                    setEditTripModal({ open: false, data: null })
                    await loadTrips()
                    setJoinDialog({ open: true, title: 'Viaje actualizado', message: 'Los cambios se guardaron correctamente.' })
                  } catch (e) {
                    alert(e?.response?.data?.error || e?.message || 'No se pudo actualizar el viaje')
                  }
                }}>Guardar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {joinDialog.open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="joinDialogTitle">
          <div className="overlay-box" style={{ textAlign: 'center' }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 9999,
              background: 'linear-gradient(135deg, #2563eb, #22c55e)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: 28,
              boxShadow: '0 10px 30px rgba(37,99,235,0.45)'
            }}>✓</div>
            <h3 id="joinDialogTitle" style={{ margin: '12px 0 4px 0', fontWeight: 800 }}> {joinDialog.title} </h3>
            <p className="muted" style={{ marginBottom: 12 }}>{joinDialog.message}</p>
            <div className="actions" style={{ justifyContent: 'center' }}>
              <Button onClick={() => { window.location.hash = '#chats'; setJoinDialog({ open: false, title: '', message: '' }) }}>Ir a chats</Button>
              <Button variant="secondary" onClick={() => setJoinDialog({ open: false, title: '', message: '' })}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {applyModal.open && (
        <ApplyToTripModal
          trip={applyModal.trip}
          isOpen={applyModal.open}
          onClose={() => setApplyModal({ open: false, trip: null })}
          onSuccess={async (roomId) => {
            try {
              if (!profile?.user_id) return
              const r = await listRoomsForUser(profile.user_id)
              setRooms(r)
              // Recargar aplicaciones del usuario para actualizar el estado
              await loadUserApplications()
              setJoinDialog({ open: true, title: 'Aplicación enviada', message: 'Abrimos un chat privado con el organizador.' })
              // Open the specific room returned by the backend
              try {
                if (roomId) {
                  const targetRoom = (r || []).find((x) => x.id === roomId)
                  if (targetRoom) {
                    await openRoom(targetRoom)
                  }
                }
              } catch {}
            } catch {}
          }}
        />
      )}
    </DashboardLayout>
  )
}


