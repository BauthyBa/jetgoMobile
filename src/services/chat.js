import { supabase } from './supabase'
import { api } from './api'

export async function getCurrentUser() {
  const { data } = await supabase.auth.getUser()
  return data.user
}

async function fetchUserDisplayName(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from('User')
      .select('userid,nombre,apellido,full_name')
      .eq('userid', userId)
      .limit(1)
    if (error) throw error
    const user = (data || [])[0]
    if (!user) return null
    const full =
      [user.nombre, user.apellido].filter(Boolean).join(' ').trim() ||
      (typeof user.full_name === 'string' ? user.full_name.trim() : '')
    return full || null
  } catch (err) {
    console.warn('No se pudo obtener el nombre del usuario:', err?.message || err)
    return null
  }
}

async function findOtherMemberId(roomId, viewerId) {
  if (!roomId || !viewerId) return null
  try {
    const { data, error } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('room_id', roomId)
      .neq('user_id', viewerId)
      .limit(1)
    if (error) throw error
    return (data || [])[0]?.user_id || null
  } catch (err) {
    console.warn('No se pudo resolver el otro integrante del chat:', err?.message || err)
    return null
  }
}

async function resolveRoomDisplayName(roomId, viewerId) {
  const otherId = await findOtherMemberId(roomId, viewerId)
  if (!otherId) return null
  return fetchUserDisplayName(otherId)
}

async function findDirectRoomByMembers(userId1, userId2) {
  try {
    const { data: user1Rooms, error: user1Error } = await supabase
      .from('chat_members')
      .select('room_id, chat_rooms!inner(is_private,is_group,application_id)')
      .eq('user_id', userId1)
      .eq('chat_rooms.is_private', true)
      .eq('chat_rooms.is_group', false)
      .is('chat_rooms.application_id', null)

    if (user1Error) throw user1Error

    const candidateIds = Array.from(
      new Set((user1Rooms || []).map((row) => row.room_id).filter(Boolean))
    )
    if (candidateIds.length === 0) return null

    const { data: user2Memberships, error: user2Error } = await supabase
      .from('chat_members')
      .select('room_id')
      .eq('user_id', userId2)
      .in('room_id', candidateIds)
      .limit(1)

    if (user2Error) throw user2Error

    return (user2Memberships || [])[0]?.room_id || null
  } catch (err) {
    console.warn('No se pudo localizar sala directa por membresía:', err?.message || err)
    return null
  }
}

async function ensureDirectConversationEntry(roomId, userId1, userId2) {
  if (!roomId || !userId1 || !userId2) return
  try {
    const { data: existing, error } = await supabase
      .from('direct_conversations')
      .select('room_id')
      .eq('room_id', roomId)
      .limit(1)
    if (!error && existing && existing.length > 0) {
      return
    }
  } catch (err) {
    console.warn('No se pudo verificar conversación directa existente:', err?.message || err)
  }

  try {
    await supabase
      .from('direct_conversations')
      .insert([{
        user_a: userId1,
        user_b: userId2,
        room_id: roomId
      }])
    console.log('✅ Entrada en direct_conversations asegurada')
  } catch (err) {
    console.warn('⚠️ No se pudo asegurar entrada en direct_conversations:', err?.message || err)
  }
}

export async function listRoomsForUser(userId) {
  const { data: memberships, error: mErr } = await supabase
    .from('chat_members')
    .select('room_id')
    .eq('user_id', userId)
  if (mErr) throw mErr
  const roomIds = (memberships || []).map((m) => m.room_id)
  if (roomIds.length === 0) return []
  const { data: rooms, error: rErr } = await supabase
    .from('chat_rooms')
    .select('id, name, created_at, trip_id, application_id, is_private, is_group, creator_id')
    .in('id', roomIds)
    .order('created_at', { ascending: false })
  if (rErr) throw rErr
  const result = rooms || []
  // Resolve display_name for private rooms: show the other participant's name
  try {
    const privateRooms = result.filter((r) => r && (r.is_private === true || r.application_id))
    for (const pr of privateRooms) {
      try {
        // Query direct_conversations to find the other user
        let otherId = null
        const { data: convs } = await supabase
          .from('direct_conversations')
          .select('user_a,user_b')
          .eq('room_id', pr.id)
          .limit(1)
        
        const conv = (convs || [])[0]
        if (conv) {
          // Pick the other user: if I'm user_a, pick user_b, and vice versa
          otherId = String(conv.user_a) === String(userId) ? conv.user_b : conv.user_a
        }

        if (!otherId) {
          otherId = await findOtherMemberId(pr.id, userId)
        }

        if (otherId) {
          const full = await fetchUserDisplayName(otherId)
          if (full) pr.display_name = full
        }
      } catch {}
    }
  } catch {}
  return result
}

export async function createRoom(name) {
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user
  if (!authUser?.id) throw new Error('Debes iniciar sesión con Supabase para crear salas')
  const creatorId = authUser.id
  const { data, error } = await supabase
    .from('chat_rooms')
    .insert([{ name, creator_id: creatorId }])
    .select()
    .single()
  if (error) throw error
  const room = data
  const { error: memErr } = await supabase
    .from('chat_members')
    .insert([{ room_id: room.id, user_id: creatorId, role: 'owner' }])
  if (memErr) throw memErr
  return room
}

export async function fetchMessages(roomId) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, room_id, user_id, content, created_at, is_file, file_url, file_name, file_type, file_size')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function sendMessage(roomId, content) {
  const { data: userData } = await supabase.auth.getUser()
  const authUser = userData?.user
  if (!authUser?.id) throw new Error('Debes iniciar sesión con Supabase para enviar mensajes')
  const userId = authUser.id
  const trimmed = (content || '').trim()
  if (!trimmed) return null
  // Ensure room exists and user is member
  const { data: r, error: rErr } = await supabase
    .from('chat_rooms')
    .select('id')
    .eq('id', roomId)
    .single()
  if (rErr || !r) throw new Error('La sala no existe')
  const { data: m, error: mErr } = await supabase
    .from('chat_members')
    .select('id')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle()
  if (mErr || !m) throw new Error('No sos miembro de esta sala')
  const { data, error } = await supabase
    .from('chat_messages')
    .insert([{ room_id: roomId, user_id: userId, content: trimmed }])
    .select()
    .single()
  if (error) throw error
  return data
}

export function subscribeToRoomMessages(roomId, onInsert) {
  const channel = supabase
    .channel(`room:${roomId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
      (payload) => {
        if (onInsert) onInsert(payload.new)
      }
    )
    .subscribe()
  return () => {
    try { supabase.removeChannel(channel) } catch {}
  }
}

export async function inviteByEmail(roomId, email, inviterId) {
  const { data } = await api.post('/chat/invite/', { room_id: roomId, email, inviter_id: inviterId })
  return data
}

// Nuevas funciones para manejo de archivos
export async function uploadChatFile(file, roomId) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('room_id', roomId)
  
  const { data } = await api.post('/chat/upload-file/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    }
  })
  return data
}

export async function sendMessageWithFile(roomId, content, fileData) {
  const { data } = await api.post('/chat/send-message/', {
    room_id: roomId,
    content: content,
    file_data: fileData
  })
  return data
}

export async function getChatRooms() {
  const { data } = await api.get('/chat/rooms/')
  return data
}

export async function getChatMessages(roomId) {
  const { data } = await api.get(`/chat/rooms/${roomId}/messages/`)
  return data
}

export async function deleteChatFile(messageId) {
  const { data } = await api.delete(`/chat/messages/${messageId}/delete-file/`)
  return data
}

export async function getRoomFileStats(roomId) {
  const { data } = await api.get(`/chat/rooms/${roomId}/file-stats/`)
  return data
}

// Función para obtener o crear un chat directo entre dos usuarios
export async function getOrCreateDirectRoom(userId1, userId2) {
  try {
    console.log('🔍 Buscando conversación directa entre:', userId1, 'y', userId2)

    if (!userId1 || !userId2) {
      throw new Error('Se necesitan ambos usuarios para iniciar un chat directo')
    }

    const normalizedUser1 = String(userId1)
    const normalizedUser2 = String(userId2)
    const [sortedA, sortedB] = [normalizedUser1, normalizedUser2].sort()

    const orConditions = [
      `and(user_a.eq.${normalizedUser1},user_b.eq.${normalizedUser2})`,
      `and(user_a.eq.${normalizedUser2},user_b.eq.${normalizedUser1})`,
      `and(user_a.eq.${sortedA},user_b.eq.${sortedB})`,
    ]
    
    // Verificar si ya existe conversación en direct_conversations
    const { data: existingConvs, error: convError } = await supabase
      .from('direct_conversations')
      .select('room_id')
      .or(orConditions.join(','))
      .limit(1)

    console.log('🔍 Resultado búsqueda conversación:', { existingConvs, convError })

    let existingRoomId = null
    if (!convError && existingConvs && existingConvs.length > 0) {
      existingRoomId = existingConvs[0].room_id
    }

    if (!existingRoomId) {
      existingRoomId = await findDirectRoomByMembers(normalizedUser1, normalizedUser2)
    }

    if (existingRoomId) {
      console.log('✅ Conversación existente encontrada, room_id:', existingRoomId)
      const { data: room, error: roomFetchError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('id', existingRoomId)
        .single()

      if (room && !roomFetchError) {
        await ensureDirectConversationEntry(existingRoomId, sortedA, sortedB)
        const displayName = await resolveRoomDisplayName(existingRoomId, normalizedUser1)
        if (displayName) {
          room.display_name = displayName
        }
        return room
      }
    }

    console.log('📝 No existe conversación, creando nueva sala...')

    const { data: newRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert([{
        name: 'Chat directo',
        is_private: true,
        is_group: false,
        creator_id: normalizedUser1
      }])
      .select()
      .single()

    if (roomError) {
      console.error('❌ Error creando sala:', roomError)
      throw roomError
    }

    console.log('✅ Sala creada:', newRoom.id)

    const { data: existingMembers } = await supabase
      .from('chat_members')
      .select('user_id')
      .eq('room_id', newRoom.id)
      .in('user_id', [normalizedUser1, normalizedUser2])

    const existingUserIds = new Set((existingMembers || []).map((m) => String(m.user_id)))
    console.log('🔍 Miembros existentes:', Array.from(existingUserIds))

    const membersToAdd = []
    if (!existingUserIds.has(normalizedUser1)) {
      membersToAdd.push({ room_id: newRoom.id, user_id: normalizedUser1, role: 'member' })
    }
    if (!existingUserIds.has(normalizedUser2)) {
      membersToAdd.push({ room_id: newRoom.id, user_id: normalizedUser2, role: 'member' })
    }

    console.log('📝 Miembros a agregar:', membersToAdd.length)

    if (membersToAdd.length > 0) {
      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(membersToAdd)

      if (membersError) {
        console.error('❌ Error agregando miembros:', membersError)
        throw membersError
      }

      console.log('✅ Miembros agregados exitosamente:', membersToAdd.length)
    } else {
      console.log('✅ Todos los miembros ya existen')
    }

    await ensureDirectConversationEntry(newRoom.id, sortedA, sortedB)

    const displayName = await resolveRoomDisplayName(newRoom.id, normalizedUser1)
    if (displayName) {
      newRoom.display_name = displayName
    }

    return newRoom
  } catch (error) {
    console.error('❌ Error creating direct room:', error)
    throw error
  }
}
