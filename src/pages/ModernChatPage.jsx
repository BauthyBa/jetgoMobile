import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import EmojiPicker from '@/components/EmojiPicker'
import ChatExpenses from '@/components/ChatExpenses'
import { getSession, supabase, updateUserMetadata } from '@/services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages } from '@/services/chat'
import { listTrips as fetchTrips, leaveTrip } from '@/services/trips'
import { respondToApplication } from '@/services/applications'
import { api, upsertProfileToBackend } from '@/services/api'
import { ChevronLeft, Users, Receipt } from 'lucide-react'

function normalizeRoomName(room) {
  return (room?.display_name || room?.name || '').trim()
}

function isPrivateRoom(room) {
  return room?.is_private === true || !!room?.application_id
}

export default function ModernChatPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [userNames, setUserNames] = useState({})
  const [applicationStatuses, setApplicationStatuses] = useState({})
  const [applicationOrganizer, setApplicationOrganizer] = useState({})
  const [tripsBase, setTripsBase] = useState([])
  const [roomQuery, setRoomQuery] = useState('')
  const [error, setError] = useState(null)
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const [showExpenses, setShowExpenses] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [leavingId, setLeavingId] = useState(null)
  const fileInputRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const messageEndRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      try {
        const session = await getSession()
        const user = session?.user || null
        const meta = user?.user_metadata || {}

        const accessToken = localStorage.getItem('access_token')
        const decodeJwt = (token) => {
          try {
            const base64Url = token.split('.')[1]
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            )
            return JSON.parse(jsonPayload)
          } catch {
            return null
          }
        }
        const jwtPayload = accessToken ? decodeJwt(accessToken) : null

        const supaVerified =
          meta?.dni_verified === true ||
          !!meta?.document_number ||
          !!meta?.dni ||
          localStorage.getItem('dni_verified') === 'true'

        const hasSupabase = !!user
        const hasBackendJwt = !!jwtPayload
        const verified = hasSupabase ? supaVerified : hasBackendJwt ? true : false

        if (!verified) {
          navigate('/verify-dni')
          return
        }

        const localMeta = (() => {
          try {
            return JSON.parse(localStorage.getItem('dni_meta') || 'null')
          } catch {
            return null
          }
        })()

        const mergedMeta = { ...meta, ...localMeta }
        const info = {
          user_id: user?.id || jwtPayload?.user_id || jwtPayload?.sub || null,
          email: user?.email || jwtPayload?.email || null,
          expISO: null,
          meta: mergedMeta,
          dni_verified: verified,
        }

        if (user && (!meta?.document_number && localMeta?.document_number)) {
          try {
            await updateUserMetadata({ ...localMeta, dni_verified: true })
          } catch (updateError) {
            console.warn('No se pudo sincronizar metadata a Supabase:', updateError?.message || updateError)
          }
          try {
            await upsertProfileToBackend({
              user_id: user.id,
              email: info.email,
              ...localMeta,
            })
          } catch (backendError) {
            console.warn('No se pudo sincronizar perfil al backend:', backendError?.message || backendError)
          }
        }

        if (!mounted) return
        setProfile(info)

        if (info.user_id) {
          const loadedRooms = await listRoomsForUser(info.user_id)
          if (!mounted) return
          setRooms(loadedRooms)

          const search = new URLSearchParams(window.location.search)
          const roomParam = search.get('room')
          const tripParam = search.get('trip')
          const targetRoom = (() => {
            if (roomParam) return loadedRooms.find((room) => String(room.id) === String(roomParam))
            if (tripParam) return loadedRooms.find((room) => String(room.trip_id) === String(tripParam))
            return null
          })()
          if (targetRoom) {
            await openRoom(targetRoom, { silentHash: true })
          }
        }
      } catch (sessionError) {
        if (mounted) setError(sessionError?.message || 'Error al iniciar la sesión')
      }
    }

    loadSession()

    return () => {
      mounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (!profile?.user_id) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchTrips()
        if (!cancelled) setTripsBase(data || [])
      } catch {
        if (!cancelled) setTripsBase([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [profile?.user_id])

  useEffect(() => {
    return () => {
      try {
        if (unsubscribeRef.current) {
          unsubscribeRef.current()
        }
      } catch (_e) {}
    }
  }, [])

  useEffect(() => {
    if (!showExpenses) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showExpenses, activeRoomId])

  const filteredRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase()
    if (!query) return rooms
    return rooms.filter((room) => normalizeRoomName(room).toLowerCase().includes(query))
  }, [roomQuery, rooms])

  async function resolveNamesForMessages(msgs) {
    try {
      const ids = Array.from(
        new Set(
          (msgs || [])
            .map((message) => message.user_id)
            .filter((id) => id && id !== profile?.user_id && !userNames[id])
        )
      )
      if (ids.length === 0) return
      const { data, error } = await supabase.from('User').select('userid,nombre,apellido').in('userid', ids)
      if (error) return
      const map = {}
      for (const row of data || []) {
        const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
        if (row?.userid && full) map[row.userid] = full
      }
      if (Object.keys(map).length > 0) {
        setUserNames((prev) => ({ ...prev, ...map }))
      }
    } catch {
      /* noop */
    }
  }

  async function fetchNamesForUserIds(ids) {
    const unique = Array.from(new Set(ids.filter(Boolean)))
    if (unique.length === 0) return {}
    const { data, error } = await supabase.from('User').select('userid,nombre,apellido').in('userid', unique)
    if (error) return {}
    const map = {}
    for (const row of data || []) {
      const full = [row?.nombre, row?.apellido].filter(Boolean).join(' ')
      if (row?.userid && full) map[row.userid] = full
    }
    return map
  }

  async function updateApplicationStatusesFromMessages(msgs) {
    try {
      const statusMap = {}
      const pendingIds = []
      for (const message of msgs || []) {
        const content = message?.content
        if (typeof content === 'string' && content.startsWith('APP_STATUS|')) {
          const [, id, status] = content.split('|')
          if (id && status) statusMap[String(id)] = String(status)
        } else if (typeof content === 'string' && content.startsWith('APP|')) {
          const [, id] = content.split('|')
          if (id) pendingIds.push(String(id))
        }
      }

      if (Object.keys(statusMap).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...statusMap }))
      }

      const uniquePending = Array.from(new Set(pendingIds))
      if (uniquePending.length === 0) return
      const { data, error } = await supabase.from('applications').select('id,status').in('id', uniquePending)
      if (error) return
      const map = {}
      for (const row of data || []) {
        if (row?.id && row?.status) map[String(row.id)] = String(row.status)
      }
      if (Object.keys(map).length > 0) {
        setApplicationStatuses((prev) => ({ ...prev, ...map }))
      }
    } catch {
      /* noop */
    }
  }

  async function openRoom(room, { silentHash = false } = {}) {
    try {
      const roomId = room?.id
      if (!roomId) return

      setActiveRoomId(roomId)
      setActiveRoom(room || null)
      setShowExpenses(false)
      if (!silentHash) {
        window.history.replaceState({}, '', '/modern-chat')
      }

      const initialMessages = await fetchMessages(roomId)
      setMessages(initialMessages)
      await updateApplicationStatusesFromMessages(initialMessages)
      await resolveNamesForMessages(initialMessages)

      try {
        if (room?.application_id) {
          const { data: appRows } = await supabase
            .from('applications')
            .select('trip_id')
            .eq('id', room.application_id)
            .limit(1)
          const tripId = (appRows || [])[0]?.trip_id
          if (tripId) {
            const { data: tripRows } = await supabase
              .from('trips')
              .select('creator_id')
              .eq('id', tripId)
              .limit(1)
            const organizerId = (tripRows || [])[0]?.creator_id
            setApplicationOrganizer((prev) => ({
              ...prev,
              [room.application_id]: String(organizerId) === String(profile?.user_id),
            }))
          }
        }
      } catch (organizerError) {
        console.warn('No se pudo resolver el organizador:', organizerError?.message || organizerError)
      }

      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch (_e) {}
      }

      const unsubscribe = subscribeToRoomMessages(roomId, (message) => {
        setMessages((prev) => [...prev, message])
        updateApplicationStatusesFromMessages([message])
        resolveNamesForMessages([message])
      })
      unsubscribeRef.current = unsubscribe
    } catch (e) {
      alert(e?.message || 'No se pudieron cargar los mensajes')
    }
  }

  async function handleSend() {
    try {
      if (!activeRoomId) return
      if (!newMessage.trim()) return
      await sendMessage(activeRoomId, newMessage)
      setNewMessage('')
      setShowEmojiPicker(false)
    } catch (e) {
      alert(e?.message || 'No se pudo enviar el mensaje')
    }
  }

  const handleFileUpload = async (event) => {
    try {
      if (!event?.target?.files?.[0]) return
      const file = event.target.files[0]
      if (file.size > 10 * 1024 * 1024) {
        alert('El archivo es demasiado grande. Máximo 10MB.')
        return
      }

      const formData = new FormData()
      formData.append('file', file)
      formData.append('room_id', activeRoomId)
      formData.append('user_id', profile.user_id)

      const response = await fetch('https://jetgoback.onrender.com/api/chat/upload-file/', {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error subiendo archivo')
      }

      const data = await response.json()
      if (data.status === 'success') {
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
      }
    } catch (uploadError) {
      console.error('Error uploading file:', uploadError)
      alert('Error subiendo archivo. Intenta nuevamente.')
    } finally {
      if (event.target) event.target.value = ''
    }
  }

  const getSenderLabel = (message) => {
    const uid = message?.user_id || ''
    if (profile?.user_id && uid === profile.user_id) return 'Tú'
    const name = userNames[uid]
    if (name) return name
    return 'Usuario'
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
  }

  const getFileIcon = (fileType) => {
    if (fileType?.startsWith('image/')) return '🖼️'
    if (fileType === 'application/pdf') return '📄'
    if (fileType?.includes('word') || fileType?.includes('document')) return '📝'
    return '📎'
  }

  const handleBackToList = () => {
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current()
      } catch (_e) {}
    }
    unsubscribeRef.current = null
    setActiveRoomId(null)
    setActiveRoom(null)
    setMessages([])
    setShowExpenses(false)
    window.history.replaceState({}, '', '/modern-chat')
  }

  const handleOpenMembers = async () => {
    try {
      if (!activeRoom) return
      const roomId = activeRoom?.id
      if (!roomId) {
        alert('No se pueden cargar integrantes: falta el room_id de la sala')
        return
      }

      if (isPrivateRoom(activeRoom)) {
        const { data: membersRows } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('room_id', roomId)
        const ids = Array.from(new Set((membersRows || []).map((member) => member.user_id).filter(Boolean)))
        const names = await fetchNamesForUserIds(ids)
        const members = ids.map((id) => ({
          user_id: id,
          name:
            profile?.user_id && id === profile.user_id
              ? profile?.meta?.first_name && profile?.meta?.last_name
                ? `${profile.meta.first_name} ${profile.meta.last_name}`
                : 'Tú'
              : names[id] || 'Usuario',
        }))
        setChatMembers(members)
        setChatInfoOpen(true)
        return
      }

      const response = await api.get('/chat-members/', { params: { room_id: roomId } })
      if (response.data?.ok && response.data?.members) {
        const members = response.data.members.map((member) => ({
          user_id: member.user_id,
          name: member.name || 'Usuario',
        }))
        setChatMembers(members)
        setChatInfoOpen(true)
        return
      }

      alert('No se pudieron cargar los integrantes del chat')
    } catch (membersError) {
      console.error('Error loading chat members', membersError)
      alert('No se pudieron cargar los integrantes del chat')
    }
  }

  const hasRooms = filteredRooms.length > 0
  const isChatOpen = Boolean(activeRoomId)
  const canShowExpenses = Boolean(activeRoom?.trip_id)
  const chatSubtitle = (() => {
    if (!activeRoom) return ''
    if (isPrivateRoom(activeRoom)) return 'Chat privado'
    if (activeRoom?.trip_id) return 'Chat de viaje'
    return 'Chat general'
  })()

  const listItems = filteredRooms.map((room) => {
    const isActive = isChatOpen && String(activeRoomId) === String(room.id)
    const subtitle = isPrivateRoom(room)
      ? 'Chat privado'
      : room.trip_id
        ? 'Chat de viaje'
        : 'Chat general'
    return (
      <button
        key={room.id}
        type="button"
        onClick={() => openRoom(room)}
        className={[
          'w-full rounded-2xl border px-4 py-4 text-left transition-all',
          'border-slate-800/60 bg-slate-900/60 hover:bg-slate-800/70',
          isActive ? 'border-emerald-400/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/20' : '',
        ].join(' ')}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-lg font-semibold leading-tight text-white">
              {normalizeRoomName(room) || 'Chat sin nombre'}
            </span>
            <span className="text-sm text-slate-400">{subtitle}</span>
          </div>
          {room.trip_id && (
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Viaje
            </span>
          )}
        </div>
      </button>
    )
  })

  const messageItems = messages.map((message) => {
    const isOwn = profile?.user_id && String(message.user_id) === String(profile.user_id)
    const isApplication = typeof message?.content === 'string' && message.content.startsWith('APP|')
    const isApplicationStatus =
      typeof message?.content === 'string' && message.content.startsWith('APP_STATUS|')

    let applicationId = null
    let displayContent = message?.content || ''
    if (isApplication) {
      const parts = displayContent.split('|')
      applicationId = parts[1]
      displayContent = parts.slice(2).join('|')
    } else if (isApplicationStatus) {
      displayContent = ''
    }

    return (
      <div
        key={message.id}
        className={[
          'max-w-xl rounded-2xl border px-4 py-3 shadow-sm transition-colors',
          isOwn ? 'self-end border-emerald-400/30 bg-emerald-500/10 text-right' : 'self-start border-slate-700/50 bg-slate-900/50 text-left',
        ].join(' ')}
      >
        <div className="text-xs font-semibold text-slate-400">{getSenderLabel(message)}</div>
        {message.is_file ? (
          <div className="mt-2 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{getFileIcon(message.file_type)}</span>
                <span>{message.file_name}</span>
              </div>
              <span className="text-xs text-slate-400">{formatFileSize(message.file_size)}</span>
            </div>
            {message.file_type?.startsWith('image/') ? (
              <a
                href={message.file_url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-xl border border-white/10"
              >
                <img
                  src={message.file_url}
                  alt={message.file_name || 'Archivo de chat'}
                  className="max-h-64 w-full object-cover"
                />
              </a>
            ) : (
              <a
                href={message.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
              >
                Descargar archivo
              </a>
            )}
          </div>
        ) : (
          displayContent && (
            <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-200">{displayContent}</div>
          )
        )}

        {(() => {
          try {
            const isPrivate = isPrivateRoom(activeRoom)
            let isOrganizer = false
            if (isPrivate && activeRoom?.application_id) {
              const cached = applicationOrganizer[activeRoom.application_id]
              if (typeof cached === 'boolean') {
                isOrganizer = cached
              }
            }
            const status = applicationStatuses[applicationId]
            const isFinal = status === 'accepted' || status === 'rejected'
            if (isApplication && applicationId && isFinal) {
              return (
                <div
                  className={[
                    'mt-3 text-sm font-semibold',
                    status === 'accepted' ? 'text-emerald-300' : 'text-red-300',
                  ].join(' ')}
                >
                  {status === 'accepted'
                    ? 'Esta solicitud ya fue aceptada.'
                    : 'Esta solicitud ya fue rechazada.'}
                </div>
              )
            }
            if (isPrivate && isOrganizer && isApplication && applicationId && !isFinal) {
              return (
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={async () => {
                      try {
                        await respondToApplication(applicationId, 'reject')
                        setApplicationStatuses((prev) => ({
                          ...prev,
                          [applicationId]: 'rejected',
                        }))
                      } catch (actionError) {
                        alert(
                          actionError?.response?.data?.error ||
                            actionError?.message ||
                            'No se pudo rechazar la solicitud'
                        )
                      }
                    }}
                  >
                    Rechazar
                  </Button>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await respondToApplication(applicationId, 'accept')
                        setApplicationStatuses((prev) => ({
                          ...prev,
                          [applicationId]: 'accepted',
                        }))
                      } catch (actionError) {
                        alert(
                          actionError?.response?.data?.error ||
                            actionError?.message ||
                            'No se pudo aceptar la solicitud'
                        )
                      }
                    }}
                  >
                    Aceptar
                  </Button>
                </div>
              )
            }
          } catch {
            return null
          }
          return null
        })()}

        <div className="mt-3 text-right text-[11px] text-slate-500">
          {new Date(message.created_at).toLocaleString()}
        </div>
      </div>
    )
  })

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-slate-950 text-white pb-24 md:pb-0">
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 pt-2 pb-6">
        <header className="space-y-2">
          <span className="text-xs uppercase tracking-[0.3em] text-slate-400">Centro de chats</span>
          <h1 className="text-3xl font-extrabold md:text-4xl">Conectá con tu equipo y organizá cada detalle</h1>
          <p className="max-w-2xl text-slate-300">
            Coordiná itinerarios, compartí archivos y llevá el control de gastos sin salir de JetGo.
          </p>
        </header>

        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!error && !profile && (
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-6 text-sm text-slate-300">
            Cargando tu experiencia de chat…
          </div>
        )}

        {profile && !isChatOpen && (
          <div className="space-y-6 pb-24 md:pb-0">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 backdrop-blur">
              <h2 className="text-xl font-semibold">Tus conversaciones</h2>
              <p className="text-sm text-slate-400">
                Explorá todos tus chats y retomá la conversación donde la dejaste.
              </p>
              <div className="mt-4">
                <Input
                  value={roomQuery}
                  onChange={(event) => setRoomQuery(event.target.value)}
                  placeholder="Buscar chat por nombre…"
                  className="border-slate-800 bg-slate-950/70 text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            {!hasRooms && (
              <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 px-6 py-12 text-center text-sm text-slate-400 backdrop-blur">
                Todavía no tenés chats activos. Unite a un viaje para empezar a conversar.
              </div>
            )}

            {hasRooms && <div className="space-y-3">{listItems}</div>}
          </div>
        )}

        {profile && isChatOpen && (
          <div className="flex flex-col gap-4 pb-24 md:pb-0">
            <div className="sticky top-[4.5rem] z-30 rounded-2xl border border-slate-800/60 bg-slate-950/90 px-4 py-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800/80 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Todos los chats
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant={showExpenses ? 'default' : 'secondary'}
                    className="flex items-center gap-2"
                    onClick={() => canShowExpenses && setShowExpenses((prev) => !prev)}
                    disabled={!canShowExpenses}
                  >
                    <Receipt className="h-4 w-4" />
                    {showExpenses ? 'Cerrar gastos' : 'Ver gastos'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={handleOpenMembers}
                  >
                    <Users className="h-4 w-4" />
                    Integrantes
                  </Button>
                </div>
              </div>
              <div className="mt-4">
                <h2 className="text-2xl font-semibold">
                  {normalizeRoomName(activeRoom) || 'Chat sin nombre'}
                </h2>
                {chatSubtitle && <p className="text-sm text-slate-400">{chatSubtitle}</p>}
              </div>
            </div>

            <div className="flex-1 overflow-hidden rounded-3xl border border-slate-800/60 bg-slate-900/60 backdrop-blur">
              <div className="flex h-full flex-col">
                {showExpenses ? (
                  <div className="flex-1 overflow-y-auto px-2 py-4 pb-32 md:pb-6">
                    <ChatExpenses
                      tripId={activeRoom?.trip_id}
                      roomId={activeRoomId}
                      userId={profile?.user_id}
                      userNames={userNames}
                    />
                  </div>
                ) : (
                  <Fragment>
                    <div className="flex-1 overflow-y-auto px-4 pt-6 pb-32 md:pb-6">
                      <div className="flex flex-col gap-3">
                        {messageItems}
                        {messages.length === 0 && (
                          <div className="text-center text-sm text-slate-400">
                            Aún no hay mensajes en este chat.
                          </div>
                        )}
                      </div>
                      <div ref={messageEndRef} />
                    </div>

                    <div className="border-t border-white/10 px-4 py-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,application/pdf,.doc,.docx,.txt"
                          onChange={handleFileUpload}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="order-2 md:order-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Adjuntar archivo
                        </Button>
                        <div className="order-1 flex flex-1 items-center gap-2 md:order-2">
                          <Input
                            value={newMessage}
                            onChange={(event) => setNewMessage(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault()
                                handleSend()
                              }
                            }}
                            placeholder="Escribí un mensaje…"
                            className="flex-1 border-slate-700 bg-slate-900/60 text-slate-200 placeholder:text-slate-500"
                          />
                          <button
                            type="button"
                            className="rounded-lg px-2 text-2xl transition-colors hover:bg-slate-800/70"
                            onClick={() => setShowEmojiPicker((prev) => !prev)}
                            title="Agregar emoji"
                          >
                            😊
                          </button>
                          <EmojiPicker
                            isOpen={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onEmojiSelect={(emoji) => {
                              setNewMessage((prev) => prev + emoji)
                              setShowEmojiPicker(false)
                            }}
                          />
                          <Button type="button" onClick={handleSend} className="px-6">
                            Enviar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {chatInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/80 p-6 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold">
                  {normalizeRoomName(activeRoom) || 'Integrantes'}
                </h3>
                <p className="text-sm text-slate-400">Conocé quién está colaborando en este espacio.</p>
              </div>
              <Button variant="secondary" onClick={() => setChatInfoOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-6 max-h-72 space-y-3 overflow-y-auto pr-1">
              {(chatMembers || []).length === 0 && (
                <div className="rounded-lg border border-slate-700/50 bg-slate-900/40 px-4 py-6 text-center text-sm text-slate-400">
                  No se pudieron cargar los integrantes o no hay datos para mostrar.
                </div>
              )}

              {(chatMembers || []).length > 0 &&
                chatMembers.map((member) => (
                  <button
                    key={member.user_id}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-emerald-400/50 hover:bg-emerald-500/10"
                    onClick={() => {
                      if (!member?.user_id) return
                      navigate(`/u/${member.user_id}`)
                      setChatInfoOpen(false)
                    }}
                  >
                    <span className="font-semibold text-white">{member.name || 'Usuario'}</span>
                    <span className="text-sm text-slate-400">Ver perfil</span>
                  </button>
                ))}
            </div>

            {activeRoom?.trip_id && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">
                  ¿Querés salir del viaje? Podés hacerlo desde acá.
                </span>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    try {
                      const tripId = activeRoom?.trip_id
                      if (!tripId || !profile?.user_id) return
                      const isOwner = (tripsBase || []).some(
                        (trip) => String(trip.id) === String(tripId) && trip.creatorId === profile.user_id,
                      )
                      const confirmMsg = isOwner
                        ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                        : '¿Seguro que querés abandonar este viaje?'
                      if (!confirm(confirmMsg)) return
                      setLeavingId(tripId)
                      const result = await leaveTrip(tripId, profile.user_id)
                      if (result?.ok !== false) {
                        setChatInfoOpen(false)
                        handleBackToList()
                        try {
                          const reloadedRooms = await listRoomsForUser(profile.user_id)
                          setRooms(reloadedRooms)
                        } catch (_reloadError) {}
                      } else {
                        alert(result?.error || 'No se pudo abandonar/eliminar el viaje')
                      }
                    } catch (leaveError) {
                      alert(leaveError?.message || 'Error al abandonar/eliminar')
                    } finally {
                      setLeavingId(null)
                    }
                  }}
                >
                  {(() => {
                    const isOwner =
                      activeRoom?.trip_id &&
                      (tripsBase || []).some(
                        (trip) =>
                          String(trip.id) === String(activeRoom.trip_id) &&
                          trip.creatorId === profile?.user_id,
                      )
                    if (leavingId === activeRoom?.trip_id) {
                      return isOwner ? 'Eliminando…' : 'Saliendo…'
                    }
                    return isOwner ? 'Eliminar viaje' : 'Abandonar viaje'
                  })()}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
