import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import BackButton from '@/components/BackButton'
import EmojiPicker from '@/components/EmojiPicker'
import ChatExpenses from '@/components/ChatExpenses'
import ConnectionStatus from '@/components/ConnectionStatus'
import Navigation from '@/components/Navigation'
import AudioRecorder from '@/components/AudioRecorder'
import AudioTranscriber from '@/components/AudioTranscriber'
import SharedPostPreview from '@/components/SharedPostPreview'
import { getSession, supabase, updateUserMetadata } from '@/services/supabase'
import { listRoomsForUser, fetchMessages, sendMessage, subscribeToRoomMessages } from '@/services/chat'
import { listTrips as fetchTrips, leaveTrip } from '@/services/trips'
import { respondToApplication } from '@/services/applications'
import { api, upsertProfileToBackend } from '@/services/api'
import InviteFriendsModal from '@/components/InviteFriendsModal'
import { transcriptionService } from '@/services/transcription'

function normalizeRoomName(room) {
  return (room?.display_name || room?.name || '').trim()
}

function isPrivateRoom(room) {
  return room?.is_private === true || !!room?.application_id
}

export default function ModernChatPage() {
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [rooms, setRooms] = useState([])
  const [activeRoomId, setActiveRoomId] = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [userNames, setUserNames] = useState({})
  const [applicationStatuses, setApplicationStatuses] = useState({})
  const [applicationOrganizer, setApplicationOrganizer] = useState({})
  const [tripsBase, setTripsBase] = useState([])
  const [chatInfoOpen, setChatInfoOpen] = useState(false)
  const [chatMembers, setChatMembers] = useState([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [roomQuery, setRoomQuery] = useState('')
  const [leavingId, setLeavingId] = useState(null)
  const [showInviteFriends, setShowInviteFriends] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [showAudioTranscriber, setShowAudioTranscriber] = useState(false)
  const [transcribingAudio, setTranscribingAudio] = useState(null)
  const [audioTranscriptions, setAudioTranscriptions] = useState({})
  const [showDeleteMessageConfirm, setShowDeleteMessageConfirm] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState(null)
  const [roomDisplayNames, setRoomDisplayNames] = useState({})
  const fileInputRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const messageEndRef = useRef(null)
  const userNamesRef = useRef({})
  const roomDisplayNamesRef = useRef({})


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
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current()
        } catch (unsubscribeError) {
          console.error('Error al desuscribirse del chat:', unsubscribeError)
        }
      }
    }
  }, [])

  useEffect(() => {
    if (!showExpenses) {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, showExpenses, activeRoomId])

  useEffect(() => {
    userNamesRef.current = userNames
  }, [userNames])

  useEffect(() => {
    roomDisplayNamesRef.current = roomDisplayNames
  }, [roomDisplayNames])

  const getRoomTitle = useCallback(
    (room) => {
      if (!room) return 'Chat'
      const customName = roomDisplayNamesRef.current[room.id]
      if (customName && customName.trim()) return customName.trim()
      const fallback = normalizeRoomName(room)
      return fallback || 'Chat sin nombre'
    },
    []
  )

  const getRoomInitial = useCallback(
    (room) => {
      const title = getRoomTitle(room)
      return title?.trim()?.charAt(0)?.toUpperCase() || '•'
    },
    [getRoomTitle]
  )

  const formatRoomTimestamp = useCallback((room) => {
    try {
      const rawDate = room?.last_message_at || room?.updated_at || room?.created_at
      if (!rawDate) return ''
      const date = new Date(rawDate)
      if (Number.isNaN(date.getTime())) return ''
      const now = new Date()
      const sameDay = date.toDateString() === now.toDateString()
      if (sameDay) {
        return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
      }
      const diff = now.getTime() - date.getTime()
      const oneDay = 24 * 60 * 60 * 1000
      if (diff < oneDay * 7) {
        return date.toLocaleDateString(undefined, { weekday: 'short' })
      }
      return date.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })
    } catch {
      return ''
    }
  }, [])

  const filteredRooms = useMemo(() => {
    const query = roomQuery.trim().toLowerCase()
    if (!query) return rooms
    return rooms.filter((room) => getRoomTitle(room).toLowerCase().includes(query))
  }, [roomQuery, rooms, getRoomTitle])

  const tripRooms = useMemo(
    () => filteredRooms.filter((room) => !isPrivateRoom(room)),
    [filteredRooms]
  )

  const privateRooms = useMemo(
    () => filteredRooms.filter((room) => isPrivateRoom(room)),
    [filteredRooms]
  )

  const resolveNamesForMessages = useCallback(
    async (msgs) => {
      try {
        const ids = Array.from(
          new Set(
            (msgs || [])
              .map((message) => message.user_id)
              .filter((id) => id && id !== profile?.user_id && !userNamesRef.current[id])
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
      } catch (namesError) {
        console.error('No se pudieron resolver nombres de usuarios:', namesError)
      }
    },
    [profile?.user_id]
  )

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

  const ensurePrivateRoomName = useCallback(
    async (room) => {
      try {
        if (!room || !isPrivateRoom(room)) return null
        const roomId = room.id
        if (!roomId || roomDisplayNamesRef.current[roomId]) {
          return roomDisplayNamesRef.current[roomId] || null
        }
        if (!profile?.user_id) return null
        const { data: directRows, error: directError } = await supabase
          .from('direct_conversations')
          .select('user_a,user_b')
          .eq('room_id', roomId)
          .limit(1)
        if (directError) {
          console.error('No se pudo cargar conversación directa:', directError)
          return null
        }
        const directRow = (directRows || [])[0]
        if (!directRow) return null
        const currentUserId = profile.user_id ? String(profile.user_id) : null
        const candidateA = directRow.user_a ? String(directRow.user_a) : null
        const candidateB = directRow.user_b ? String(directRow.user_b) : null
        const otherUserId =
          currentUserId && candidateA && candidateA === currentUserId
            ? candidateB
            : candidateA
        if (!otherUserId) return null
        const nameMap = await fetchNamesForUserIds([otherUserId])
        const friendlyName = nameMap[otherUserId]
        if (friendlyName) {
          setRoomDisplayNames((prev) => {
            const next = { ...prev, [roomId]: friendlyName }
            roomDisplayNamesRef.current = next
            return next
          })
          return friendlyName
        }
        return null
      } catch (privateNameError) {
        console.error('No se pudo resolver el nombre del chat privado:', privateNameError)
        return null
      }
    },
    [profile?.user_id]
  )

  const updateApplicationStatusesFromMessages = useCallback(async (msgs) => {
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
    } catch (statusError) {
      console.error('No se pudieron actualizar los estados de aplicaciones:', statusError)
    }
  }, [])

  const openRoom = useCallback(
    async (room, { silentHash = false } = {}) => {
      try {
        const roomId = room?.id
        if (!roomId) return

      setActiveRoomId(roomId)
      setActiveRoom(room || null)
      setShowExpenses(false)
      if (!silentHash) {
        window.history.replaceState({}, '', '/modern-chat')
      }
      if (isPrivateRoom(room)) {
        ensurePrivateRoomName(room)
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
          } catch (previousUnsubscribeError) {
            console.error('Error al cancelar suscripción previa:', previousUnsubscribeError)
          }
        }

        const unsubscribe = subscribeToRoomMessages(roomId, (message) => {
          setMessages((prev) => [...prev, message])
          updateApplicationStatusesFromMessages([message])
          resolveNamesForMessages([message])
        })
        unsubscribeRef.current = unsubscribe
      } catch (openRoomError) {
        alert(openRoomError?.message || 'No se pudieron cargar los mensajes')
      }
    },
    [profile?.user_id, resolveNamesForMessages, updateApplicationStatusesFromMessages, ensurePrivateRoomName]
  )

  useEffect(() => {
    if (!profile?.user_id) return
    const privateRoomsToResolve = (rooms || []).filter(
      (room) => isPrivateRoom(room) && !roomDisplayNamesRef.current[room.id]
    )
    if (privateRoomsToResolve.length === 0) return
    let cancelled = false
    ;(async () => {
      for (const room of privateRoomsToResolve) {
        if (cancelled) break
        await ensurePrivateRoomName(room)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [rooms, profile?.user_id, ensurePrivateRoomName])

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
          } catch (updateSupabaseError) {
            console.warn('No se pudo sincronizar metadata a Supabase:', updateSupabaseError?.message || updateSupabaseError)
          }
          try {
            await upsertProfileToBackend({
              user_id: user.id,
              email: info.email,
              ...localMeta,
            })
          } catch (backendSyncError) {
            console.warn('No se pudo sincronizar perfil al backend:', backendSyncError?.message || backendSyncError)
          }
        }

        if (!mounted) return
        setProfile(info)

        if (info.user_id) {
          try {
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
          } catch (roomsError) {
            console.warn('No se pudieron cargar salas:', roomsError?.message || roomsError)
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
  }, [navigate, openRoom])

  async function handleSend() {
    try {
      if (!activeRoomId) return
      if (!newMessage.trim()) return
      await sendMessage(activeRoomId, newMessage)
      setNewMessage('')
      setShowEmojiPicker(false)
    } catch (sendError) {
      alert(sendError?.message || 'No se pudo enviar el mensaje')
    }
  }

  const confirmDeleteMessage = (messageId) => {
    setMessageToDelete(messageId)
    setShowDeleteMessageConfirm(true)
  }

  const deleteMessage = async () => {
    if (!messageToDelete) return
    try {
      const { error: deleteError } = await supabase.from('chat_messages').delete().eq('id', messageToDelete)
      if (deleteError) throw deleteError
      setMessages((prev) => prev.filter((message) => message.id !== messageToDelete))
      setShowDeleteMessageConfirm(false)
      setMessageToDelete(null)
    } catch (deleteErr) {
      console.error('Error al eliminar mensaje:', deleteErr)
      alert('Error al eliminar el mensaje')
      setShowDeleteMessageConfirm(false)
      setMessageToDelete(null)
    }
  }

  const handleFileUpload = async (event) => {
    try {
      const file = event.target.files?.[0]
      if (!file || !activeRoomId || !profile?.user_id) return

      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]
      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten imágenes, PDFs y documentos de texto.')
        return
      }

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

  const handleAudioRecorded = async (audioBlob) => {
    try {
      if (!activeRoomId || !profile?.user_id) return
      const formData = new FormData()
      formData.append('file', audioBlob, 'audio.webm')
      formData.append('room_id', activeRoomId)
      formData.append('user_id', profile.user_id)

      const response = await fetch('https://jetgoback.onrender.com/api/chat/upload-file/', {
        method: 'POST',
        body: formData,
        mode: 'cors',
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error subiendo audio')
      }

      const data = await response.json()
      if (data.status === 'success') {
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
        setShowAudioRecorder(false)
      }
    } catch (audioError) {
      console.error('Error uploading audio:', audioError)
      alert('Error subiendo audio. Intenta nuevamente.')
    }
  }

  const handleAudioCancel = () => {
    setShowAudioRecorder(false)
  }

  const handleTranscriptionComplete = async (transcript) => {
    try {
      if (!activeRoomId || !transcript.trim()) return
      const saved = await sendMessage(activeRoomId, transcript)
      if (saved) {
        setShowAudioTranscriber(false)
        const updatedMessages = await fetchMessages(activeRoomId)
        setMessages(updatedMessages)
      }
    } catch (transcriptionError) {
      console.error('Error sending transcription:', transcriptionError)
      alert('Error enviando transcripción. Intenta nuevamente.')
    }
  }

  const handleTranscriptionCancel = () => {
    setShowAudioTranscriber(false)
  }

  const handleTranscribeAudio = async (messageId, audioUrl) => {
    try {
      setTranscribingAudio(messageId)
      const transcription = await transcriptionService.transcribeAudio(audioUrl, 'es')
      if (transcription && transcription.trim()) {
        setAudioTranscriptions((prev) => ({
          ...prev,
          [messageId]: transcription.trim(),
        }))
      } else {
        alert('No se pudo transcribir el audio. Intenta nuevamente.')
      }
    } catch (error) {
      console.error('Error transcribing audio:', error)
      alert('Error transcribiendo el audio. Intenta nuevamente.')
    } finally {
      setTranscribingAudio(null)
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
    if (fileType?.startsWith('audio/')) return '🎵'
    return '📎'
  }

  const activeRoomBadge = activeRoom
    ? isPrivateRoom(activeRoom)
      ? 'Privado'
      : activeRoom?.trip_id
        ? 'Viaje'
        : null
    : null

  const renderRoomCard = (room) => {
    const isActive = activeRoomId && String(activeRoomId) === String(room.id)
    const isPrivate = isPrivateRoom(room)
    const title = getRoomTitle(room)
    const timestamp = formatRoomTimestamp(room)
    const badgeLabel = isPrivate ? 'Privado' : room.trip_id ? 'Viaje' : 'General'

    return (
      <div
        key={room.id}
        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 ${
          isActive
            ? 'border-emerald-400/70 bg-emerald-500/15 shadow-lg shadow-emerald-500/20'
            : 'border-slate-800/60 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-800/70'
        } cursor-pointer`}
        onClick={() => openRoom(room)}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-semibold text-white shadow-inner ${
            isPrivate
              ? 'bg-gradient-to-br from-blue-500/80 to-blue-600/60'
              : 'bg-gradient-to-br from-emerald-500/80 to-emerald-600/60'
          } ${isActive ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-slate-900' : ''}`}
        >
          <span>{getRoomInitial(room)}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-white truncate">{title}</h3>
            {timestamp && <span className="text-xs text-slate-400">{timestamp}</span>}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-800/80 px-2 py-0.5 text-[11px] uppercase tracking-wide text-slate-300">
              {badgeLabel}
            </span>
            <span className="truncate">
              {isPrivate ? 'Conversación privada' : room.trip_id ? 'Chat de viaje con tu equipo' : 'Chat general'}
            </span>
          </div>
          {room.trip_id && (
            <div className="mt-1 text-[11px] font-medium text-emerald-300">💰 Gastos compartidos disponibles</div>
          )}
        </div>
      </div>
    )
  }

  const hasRooms = tripRooms.length + privateRooms.length > 0
  const isChatOpen = Boolean(activeRoomId)

  const closeActiveRoom = useCallback(() => {
    if (unsubscribeRef.current) {
      try {
        unsubscribeRef.current()
      } catch (unsubscribeError) {
        console.error('Error al salir del chat:', unsubscribeError)
      }
      unsubscribeRef.current = null
    }
    setActiveRoomId(null)
    setActiveRoom(null)
    setMessages([])
    setShowExpenses(false)
    window.history.replaceState({}, '', '/modern-chat')
  }, [])

  return (
    <div className="relative h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
      {!isChatOpen && <Navigation />}
      <ConnectionStatus />
      {error && (
        <div className="absolute top-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-3 text-sm text-red-100 shadow-lg">
          {error}
        </div>
      )}
      <div className="fixed inset-0 opacity-30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(168,85,247,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 flex h-screen">
        {!isChatOpen ? (
          <div className="mx-auto flex h-full w-full max-w-4xl flex-col px-4 py-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white">Tus chats</h1>
                <p className="text-sm text-slate-400">Elegí una conversación para continuar donde la dejaste.</p>
              </div>
              <BackButton fallback="/profile" variant="secondary" className="hidden sm:inline-flex">
                Volver
              </BackButton>
            </div>
            <div className="mt-6">
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <Input
                  value={roomQuery}
                  onChange={(event) => setRoomQuery(event.target.value)}
                  placeholder="Buscar conversaciones..."
                  className="w-full rounded-full border-slate-700 bg-slate-900/80 py-3 pl-12 pr-4 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400/60"
                />
              </div>
            </div>
            <div className="mt-8 flex-1 overflow-y-auto pb-12">
              {!hasRooms && (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-slate-400">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800/50">
                    <svg className="h-8 w-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-base font-medium text-slate-300">Todavía no tenés chats activos</p>
                  <p className="mt-1 text-xs text-slate-500">Unite a un viaje o conecta con alguien para empezar a conversar.</p>
                </div>
              )}
              {hasRooms && (
                <div className="space-y-6">
                  {tripRooms.length > 0 && (
                    <section className="space-y-3">
                      <header className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-400" />
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Viajes</h2>
                        <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-xs text-slate-500">{tripRooms.length}</span>
                      </header>
                      <div className="space-y-2">{tripRooms.map((room) => renderRoomCard(room))}</div>
                    </section>
                  )}
                  {privateRooms.length > 0 && (
                    <section className="space-y-3">
                      <header className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-blue-400" />
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Privados</h2>
                        <span className="rounded-full bg-slate-800/70 px-2 py-0.5 text-xs text-slate-500">{privateRooms.length}</span>
                      </header>
                      <div className="space-y-2">{privateRooms.map((room) => renderRoomCard(room))}</div>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col">
            <div className="bg-slate-900/85 backdrop-blur-xl border-b border-slate-700/60 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-800/70 px-4 text-slate-200 hover:bg-slate-700/60"
                    onClick={closeActiveRoom}
                  >
                    ← Chats
                  </Button>
                  <div className="hidden h-12 w-12 items-center justify-center rounded-full bg-slate-800/70 text-lg font-semibold text-emerald-200 shadow-inner sm:flex">
                    <span>{getRoomInitial(activeRoom)}</span>
                  </div>
                  <div>
                    {isPrivateRoom(activeRoom) ? (
                      <button
                        onClick={async () => {
                          try {
                              const roomId = activeRoom?.id
                              if (!roomId) return
                              const { data: directConversations, error: directError } = await supabase
                                .from('direct_conversations')
                                .select('user_a, user_b')
                                .eq('room_id', roomId)
                              if (directError) throw directError

                              const directConv = (directConversations || [])[0]
                              if (!directConv) return
                              const otherUserId =
                                directConv.user_a === profile?.user_id ? directConv.user_b : directConv.user_a
                              if (otherUserId) {
                                navigate(`/u/${otherUserId}`)
                              }
                            } catch (navigateError) {
                              console.error('Error navigating to profile:', navigateError)
                            }
                          }}
                          className="text-xl font-semibold text-white transition-colors hover:text-emerald-300"
                        >
                          {getRoomTitle(activeRoom)}
                        </button>
                      ) : (
                        <h2 className="text-xl font-semibold text-white">{getRoomTitle(activeRoom)}</h2>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`
                          text-xs px-2 py-1 rounded-full font-medium
                          ${activeRoomBadge === 'Privado' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}
                        `}
                        >
                          {activeRoomBadge}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeRoom?.trip_id && (
                      <Button
                        variant={showExpenses ? 'default' : 'secondary'}
                        onClick={() => setShowExpenses((prev) => !prev)}
                        className="hidden sm:flex"
                      >
                        {showExpenses ? '💬 Chat' : '💰 Gastos'}
                      </Button>
                    )}
                    {!isPrivateRoom(activeRoom) && (
                      <Button
                        variant="secondary"
                        onClick={async () => {
                          try {
                            if (isPrivateRoom(activeRoom)) {
                              const roomId = activeRoom?.id
                              if (!roomId) {
                                alert('Sala no válida')
                                return
                              }
                              const { data: membersRows } = await supabase.from('chat_members').select('user_id').eq('room_id', roomId)
                              const ids = Array.from(new Set((membersRows || []).map((member) => member.user_id).filter(Boolean)))
                              const nameMap = await fetchNamesForUserIds(ids)
                              const members = ids
                                .filter((id) => id !== profile?.user_id)
                                .map((id) => ({
                                  user_id: id,
                                  name: nameMap[id] || 'Usuario',
                                }))
                              setChatMembers(members)
                              setChatInfoOpen(true)
                              return
                            }

                            const roomId = activeRoom?.id
                            if (!roomId) {
                              alert('No se pueden cargar integrantes: falta el room_id de la sala')
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
                            } else {
                              alert('No se pudieron cargar los integrantes')
                            }
                          } catch (membersError) {
                            console.error('Error en chat-members:', membersError)
                            if (membersError.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
                              alert('La petición fue bloqueada por el navegador. Revisá extensiones o adblockers.')
                            } else {
                              alert('No se pudieron cargar los integrantes.')
                            }
                          }
                        }}
                      >
                        👥 Integrantes
                      </Button>
                    )}
                </div>
              </div>
            </div>

            {showExpenses ? (
              <div className="flex-1 overflow-hidden bg-slate-900/70">
                <ChatExpenses tripId={activeRoom?.trip_id} roomId={activeRoomId} userId={profile?.user_id} userNames={userNames} />
              </div>
            ) : (
              <div
                className="flex flex-1 flex-col bg-slate-900/70"
                style={{
                  backgroundImage:
                    'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.08) 25%, transparent 25%, transparent 50%, rgba(59, 130, 246, 0.06) 50%, rgba(59, 130, 246, 0.06) 75%, transparent 75%, transparent 100%)',
                  backgroundSize: '48px 48px',
                }}
              >
                <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                  <div className="mx-auto flex max-w-4xl flex-col gap-4 pb-8">
                    {messages.map((message) => {
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

                          const showSenderLabel = !isOwn && !isPrivateRoom(activeRoom)
                          const timeLabel = (() => {
                            try {
                              const created = new Date(message.created_at)
                              if (Number.isNaN(created.getTime())) return ''
                              return created.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
                            } catch {
                              return ''
                            }
                          })()
                          const bubbleColorClasses = isOwn
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border border-emerald-400/40'
                            : 'bg-slate-800/80 text-slate-100 border border-slate-700/60'
                          const bubbleRadiusClasses = isOwn ? 'rounded-3xl rounded-br-md' : 'rounded-3xl rounded-bl-md'
                          const timeTextColor = isOwn ? 'text-emerald-50/80' : 'text-slate-300/70'

                          return (
                            <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                              <div className="max-w-[80%] sm:max-w-[70%]">
                                <div
                                  className={`relative px-4 py-2.5 text-sm leading-relaxed shadow-lg shadow-black/30 backdrop-blur-sm ${bubbleColorClasses} ${bubbleRadiusClasses}`}
                                >
                                  {showSenderLabel && (
                                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                                      {getSenderLabel(message)}
                                    </div>
                                  )}

                                  {message.is_file ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                          <span>{getFileIcon(message.file_type)}</span>
                                          <span>{message.file_name}</span>
                                        </div>
                                        <span className="text-xs opacity-70">{formatFileSize(message.file_size)}</span>
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
                                      ) : message.file_type === 'shared_post' ? (
                                        <div className="my-2">
                                          {(() => {
                                            try {
                                              const sharedPostData = JSON.parse(message.file_url)
                                              return <SharedPostPreview sharedPostData={sharedPostData} />
                                            } catch (previewError) {
                                              console.error('Error parsing shared post:', previewError)
                                              return (
                                                <div className="p-3 bg-slate-700/50 rounded-lg text-slate-300 text-sm">
                                                  📱 Post compartido (error al cargar preview)
                                                </div>
                                              )
                                            }
                                          })()}
                                        </div>
                                      ) : message.file_type?.startsWith('audio/') ? (
                                        <div className="space-y-2">
                                          <audio
                                            controls
                                            className="w-full"
                                            style={{
                                              background: 'rgba(255, 255, 255, 0.1)',
                                              borderRadius: '8px',
                                              padding: '8px',
                                            }}
                                          >
                                            <source src={message.file_url} type={message.file_type} />
                                            Tu navegador no soporta el elemento de audio.
                                          </audio>
                                          {audioTranscriptions[message.id] && (
                                            <div className="mt-2 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                                              <div className="flex items-center gap-2 mb-2">
                                                <span className="text-xs font-medium text-emerald-300">📝 Transcripción:</span>
                                              </div>
                                              <p className="text-sm text-slate-200">{audioTranscriptions[message.id]}</p>
                                            </div>
                                          )}
                                          {!audioTranscriptions[message.id] && transcribingAudio !== message.id && (
                                            <div className="mt-1 text-xs text-slate-500">
                                              💡 Haz clic en "Transcribir" para convertir el audio a texto automáticamente (sin sonido)
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <a
                                              href={message.file_url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex items-center gap-2 text-sm text-emerald-300 hover:text-emerald-200"
                                            >
                                              Descargar audio
                                            </a>
                                            {!audioTranscriptions[message.id] && (
                                              <button
                                                onClick={() => handleTranscribeAudio(message.id, message.file_url)}
                                                disabled={transcribingAudio === message.id}
                                                className="inline-flex items-center gap-1 text-sm text-blue-300 hover:text-blue-200 disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1 rounded border border-blue-400/30 hover:bg-blue-500/10"
                                              >
                                                {transcribingAudio === message.id ? (
                                                  <>
                                                    <span className="animate-spin">⏳</span>
                                                    Escuchando...
                                                  </>
                                                ) : (
                                                  <>🎙️ Transcribir</>
                                                )}
                                              </button>
                                            )}
                                          </div>
                                        </div>
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
                                    displayContent && <div className="whitespace-pre-wrap break-words">{displayContent}</div>
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
                                      const isOwnMessage = profile?.user_id && String(message.user_id) === String(profile.user_id)
                                      if (isApplication && applicationId && isFinal) {
                                        return (
                                          <div
                                            className={`mt-3 text-sm font-semibold ${
                                              status === 'accepted' ? 'text-emerald-300' : 'text-red-300'
                                            }`}
                                          >
                                            {status === 'accepted'
                                              ? 'Esta solicitud ya fue aceptada.'
                                              : 'Esta solicitud ya fue rechazada.'}
                                          </div>
                                        )
                                      }
                                      if (isPrivate && isOrganizer && isApplication && applicationId && !isFinal && !isOwnMessage) {
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

                                  <div className="mt-2 flex items-center justify-end gap-2 text-[11px]">
                                    {timeLabel && <span className={timeTextColor}>{timeLabel}</span>}
                                    {isOwn && <span className="text-emerald-100">✓✓</span>}
                                    {isOwn && (
                                      <button
                                        onClick={() => confirmDeleteMessage(message.id)}
                                        className="ml-1 text-red-300/80 transition hover:text-red-200"
                                        title="Eliminar mensaje"
                                      >
                                        🗑️
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}

                        {messages.length === 0 && (
                          <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-700/50 flex items-center justify-center">
                              <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <p className="text-slate-400 text-sm">Aún no hay mensajes en este chat</p>
                            <p className="text-slate-500 text-xs mt-1">¡Sé el primero en escribir algo!</p>
                          </div>
                        )}
                    <div ref={messageEndRef} />
                  </div>
                </div>

                <div className="flex-shrink-0 border-t border-slate-700/60 bg-slate-900/85 px-4 py-4 backdrop-blur-xl sm:px-6">
                  <div className="mx-auto max-w-4xl">
                    {showAudioRecorder && (
                      <div className="mb-4">
                        <AudioRecorder onAudioRecorded={handleAudioRecorded} onCancel={handleAudioCancel} />
                      </div>
                    )}
                    {showAudioTranscriber && (
                      <div className="mb-4">
                        <AudioTranscriber
                          onTranscriptionComplete={handleTranscriptionComplete}
                          onCancel={handleTranscriptionCancel}
                        />
                      </div>
                    )}
                    <div className="flex items-end gap-3">
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
                        onClick={() => fileInputRef.current?.click()}
                        className="h-12 w-12 shrink-0 rounded-full bg-slate-800/70 text-lg text-slate-200 hover:bg-slate-700/80"
                      >
                        📎
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowAudioRecorder((prev) => !prev)}
                        className="h-12 w-12 shrink-0 rounded-full bg-slate-800/70 text-lg text-slate-200 hover:bg-slate-700/80"
                      >
                        🎤
                      </Button>
                      <div className="relative flex-1">
                        <Input
                          value={newMessage}
                          onChange={(event) => setNewMessage(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              handleSend()
                            }
                          }}
                          placeholder="Escribí un mensaje..."
                          className="rounded-full border-slate-700 bg-slate-800/60 py-3 pl-5 pr-24 text-slate-200 placeholder:text-slate-500 focus:border-emerald-400/60"
                        />
                        <button
                          type="button"
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-xl text-slate-400 transition-colors hover:text-emerald-300"
                          onClick={() => setShowAudioTranscriber((prev) => !prev)}
                          title="Transcribir voz"
                        >
                          🎙️
                        </button>
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xl text-slate-400 transition-colors hover:text-emerald-300"
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
                      </div>
                      <Button
                        onClick={handleSend}
                        className="h-12 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 font-semibold text-white hover:from-emerald-600 hover:to-emerald-700"
                      >
                        Enviar
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {isChatOpen && chatInfoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-white">{getRoomTitle(activeRoom) || 'Integrantes'}</h3>
                <p className="text-sm text-slate-400">Conocé quién está colaborando en este espacio.</p>
              </div>
              <Button variant="secondary" onClick={() => setChatInfoOpen(false)}>
                Cerrar
              </Button>
            </div>

            <div className="mt-6 space-y-3 max-h-72 overflow-y-auto pr-1">
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
                      try {
                        if (!member?.user_id) return
                        navigate(`/u/${member.user_id}`)
                        setChatInfoOpen(false)
                      } catch {
                        /* noop */
                      }
                    }}
                  >
                    <span className="font-semibold text-white">{member.name || 'Usuario'}</span>
                    <span className="text-sm text-slate-400">Ver perfil</span>
                  </button>
                ))}
            </div>

            {activeRoom?.trip_id && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                <span className="text-sm text-slate-400">¿Querés salir del viaje? Podés hacerlo desde acá.</span>
                <div className="flex gap-2">
                  {(() => {
                    const isOwner = (tripsBase || []).some(
                      (trip) => String(trip.id) === String(activeRoom.trip_id) && trip.creatorId === profile?.user_id
                    )
                    const isGroupChat = activeRoom?.is_group === true
                    return isOwner && isGroupChat ? (
                      <Button
                        variant="secondary"
                        onClick={() => setShowInviteFriends(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        👥 Invitar Amigos
                      </Button>
                    ) : null
                  })()}
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      try {
                        const tripId = activeRoom?.trip_id
                        if (!tripId || !profile?.user_id) return
                        const isOwner = (tripsBase || []).some(
                          (trip) => String(trip.id) === String(tripId) && trip.creatorId === profile.user_id
                        )
                        const confirmMsg = isOwner
                          ? 'Sos el organizador. Se eliminará el viaje y su chat para todos. ¿Continuar?'
                          : '¿Seguro que querés abandonar este viaje?'
                        if (!confirm(confirmMsg)) return
                        setLeavingId(tripId)
                        const result = await leaveTrip(tripId, profile.user_id)
                        if (result?.ok !== false) {
                          setChatInfoOpen(false)
                          setActiveRoomId(null)
                          setActiveRoom(null)
                          setMessages([])
                          try {
                            const reloadedRooms = await listRoomsForUser(profile.user_id)
                            setRooms(reloadedRooms)
                          } catch (reloadError) {
                            console.error('No se pudieron recargar las salas tras abandonar el viaje:', reloadError)
                          }
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
                          (trip) => String(trip.id) === String(activeRoom.trip_id) && trip.creatorId === profile?.user_id
                        )
                      return leavingId === activeRoom?.trip_id
                        ? isOwner
                          ? 'Eliminando…'
                          : 'Saliendo…'
                        : isOwner
                          ? 'Eliminar viaje'
                          : 'Abandonar viaje'
                    })()}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isChatOpen && showInviteFriends && (
        <InviteFriendsModal
          isOpen={showInviteFriends}
          tripId={activeRoom?.trip_id}
          organizerId={profile?.user_id}
          tripTitle={activeRoom?.name || 'Viaje'}
          onClose={() => setShowInviteFriends(false)}
        />
      )}

      {isChatOpen && showDeleteMessageConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                  <span className="text-2xl">🗑️</span>
                </div>
                <h3 className="text-xl font-bold text-white">Eliminar Mensaje</h3>
              </div>
            </div>

            <div className="px-6 py-6">
              <p className="text-slate-300 text-base leading-relaxed">
                ¿Estás seguro de que quieres eliminar este mensaje? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="bg-slate-800/50 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteMessageConfirm(false)
                  setMessageToDelete(null)
                }}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deleteMessage}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span>🗑️</span>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
