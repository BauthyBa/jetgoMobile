import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile, Plus, ChevronLeft, ChevronRight, X, UserPlus, UserCheck, Trash2 } from 'lucide-react'
import API_CONFIG from '@/config/api'
import { sendFriendRequest } from '@/services/friends'

export default function SocialPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [posts, setPosts] = useState([])
  const [stories, setStories] = useState([])
  const [suggestedUsers, setSuggestedUsers] = useState([])
  const [suggestedTrips, setSuggestedTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [likedPosts, setLikedPosts] = useState(new Set())
  const [comments, setComments] = useState({})
  const [showComments, setShowComments] = useState({})
  const [newComment, setNewComment] = useState({})
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [userChats, setUserChats] = useState([])
  const [showStoryModal, setShowStoryModal] = useState(false)
  const [storyFile, setStoryFile] = useState(null)
  const [storyPreview, setStoryPreview] = useState(null)
  const [storyContent, setStoryContent] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState({})
  const [uploadingStory, setUploadingStory] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [currentStory, setCurrentStory] = useState(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [friendshipStatuses, setFriendshipStatuses] = useState({})
  const [showPostMenu, setShowPostMenu] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)

  useEffect(() => {
    getCurrentUser()
    loadPosts()
  }, [])

  useEffect(() => {
    if (user?.userid) {
      loadStories()
      loadSuggestions()
    }
  }, [user])

  const getCurrentUser = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        // Obtener datos completos del usuario desde la tabla User
        const { data: userData, error } = await supabase
          .from('User')
          .select('userid, nombre, apellido, avatar_url, bio')
          .eq('userid', authUser.id)
          .single()
        
        if (error) {
          console.error('Error fetching user data:', error)
          // Si no hay datos en User, usar solo authUser
          setUser(authUser)
        } else {
          // Combinar datos de auth con datos de la tabla User
          setUser({
            ...authUser,
            ...userData,
            id: authUser.id // Mantener id para compatibilidad
          })
        }
      }
    } catch (error) {
      console.error('Error getting user:', error)
    }
  }

  const loadPosts = async () => {
    try {
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStories = async () => {
    try {
      // Cargar todas las historias
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.STORIES)
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const allStories = data.stories || []
        
        // Si no hay usuario logueado, no mostrar historias
        if (!user?.userid) {
          setStories([])
          return
        }

        // Obtener lista de amigos (solicitudes aceptadas)
        const { data: friendRequests } = await supabase
          .from('friend_requests')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${user.userid},receiver_id.eq.${user.userid}`)
          .eq('status', 'accepted')

        // Crear set de IDs de amigos
        const friendIds = new Set()
        friendRequests?.forEach(req => {
          const friendId = req.sender_id === user.userid ? req.receiver_id : req.sender_id
          friendIds.add(friendId)
        })

        // Filtrar historias: solo de amigos o propias
        const filteredStories = allStories.filter(story => {
          const storyUserId = story.user_id || story.author?.userid || story.author?.id
          // Mostrar si es propia o de un amigo
          return storyUserId === user.userid || friendIds.has(storyUserId)
        })

        setStories(filteredStories)
      }
    } catch (error) {
      console.error('Error loading stories:', error)
    }
  }

  const loadSuggestions = async () => {
    try {
      if (!user?.userid) return

      // Cargar solicitudes de amistad aceptadas (usar friend_requests, no friendships)
      const { data: acceptedRequests } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.userid},receiver_id.eq.${user.userid}`)
        .eq('status', 'accepted')
      
      const friendIds = new Set()
      acceptedRequests?.forEach(req => {
        friendIds.add(req.sender_id === user.userid ? req.receiver_id : req.sender_id)
      })
      friendIds.add(user.userid) // Excluirse a sí mismo

      // Cargar usuarios sugeridos (no amigos)
      let query = supabase
        .from('User')
        .select('userid, nombre, apellido, avatar_url, bio')
      
      // Solo excluir amigos si hay alguno
      if (friendIds.size > 0) {
        query = query.not('userid', 'in', `(${Array.from(friendIds).join(',')})`)
      }
      
      const { data: users } = await query.limit(5)
      setSuggestedUsers(users || [])

      // Cargar estados de amistad para usuarios sugeridos
      if (users && users.length > 0) {
        const statuses = {}
        for (const suggestedUser of users) {
          const { data: existingRequest } = await supabase
            .from('friend_requests')
            .select('status')
            .or(`and(sender_id.eq.${user.userid},receiver_id.eq.${suggestedUser.userid}),and(sender_id.eq.${suggestedUser.userid},receiver_id.eq.${user.userid})`)
            .single()
          
          statuses[suggestedUser.userid] = existingRequest?.status || null
        }
        setFriendshipStatuses(statuses)
      }

      // Cargar viajes del usuario (usar trip_members, no trip_participants)
      const { data: userTripMemberships } = await supabase
        .from('trip_members')
        .select('trip_id')
        .eq('user_id', user.userid)
      
      const userTripIds = userTripMemberships?.map(t => t.trip_id) || []

      console.log('User trip IDs:', userTripIds)

      // Sugerir viajes activos y disponibles
      let tripQuery = supabase
        .from('trips')
        .select('id, name, destination, image_url, budget_min, budget_max, created_at, status')
        .order('created_at', { ascending: false })
      
      // Filtrar por status si existe el campo
      // Si no existe, la query seguirá funcionando
      try {
        tripQuery = tripQuery.or('status.is.null,status.eq.active')
      } catch (e) {
        // Si falla, continuar sin el filtro de status
      }
      
      const { data: allTrips, error: tripsError } = await tripQuery.limit(20)
      
      if (tripsError) {
        console.error('Error loading trips:', tripsError)
      }

      console.log('All trips loaded:', allTrips?.length)

      // Filtrar viajes en los que el usuario NO está
      const filteredTrips = (allTrips || []).filter(trip => !userTripIds.includes(trip.id))
      
      console.log('Filtered trips (not joined):', filteredTrips.length)

      // Tomar los primeros 5
      setSuggestedTrips(filteredTrips.slice(0, 5))
    } catch (error) {
      console.error('Error loading suggestions:', error)
    }
  }

  const likePost = async (postId) => {
    try {
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/like/`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.action === 'liked') {
          setLikedPosts(prev => new Set([...prev, postId]))
        } else {
          setLikedPosts(prev => {
            const newSet = new Set(prev)
            newSet.delete(postId)
            return newSet
          })
        }
        loadPosts()
      }
    } catch (error) {
      console.error('Error liking post:', error)
    }
  }

  const toggleComments = async (postId) => {
    setShowComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }))
    
    // Cargar comentarios si aún no están cargados
    if (!comments[postId]) {
      await loadComments(postId)
    }
  }

  const loadComments = async (postId) => {
    try {
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/comments/`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        setComments(prev => ({
          ...prev,
          [postId]: data.comments || []
        }))
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    }
  }

  const createComment = async (postId) => {
    try {
      if (!user?.id) {
        alert('Debes iniciar sesión para comentar')
        return
      }

      const commentText = newComment[postId]?.trim()
      if (!commentText) return

      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postId}/comments/`
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          content: commentText
        })
      })

      if (response.ok) {
        // Limpiar input
        setNewComment(prev => ({
          ...prev,
          [postId]: ''
        }))
        // Recargar comentarios
        await loadComments(postId)
      }
    } catch (error) {
      console.error('Error creating comment:', error)
    }
  }

  const sharePost = async (post) => {
    setSelectedPost(post)
    setShowShareModal(true)
    await loadUserChats()
  }

  const confirmDeletePost = (postId) => {
    setPostToDelete(postId)
    setShowDeleteConfirm(true)
    setShowPostMenu(null)
  }

  const deletePost = async () => {
    if (!postToDelete) return

    try {
      const url = `${API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)}${postToDelete}/`
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        // Eliminar del estado local
        setPosts(prevPosts => prevPosts.filter(p => p.id !== postToDelete))
        setShowDeleteConfirm(false)
        setPostToDelete(null)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Error al eliminar el post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Error al eliminar el post')
      setShowDeleteConfirm(false)
      setPostToDelete(null)
    }
  }

  const loadUserChats = async () => {
    try {
      if (!user?.id) return

      // Obtener IDs de rooms del usuario
      const { data: memberData } = await supabase
        .from('chat_members')
        .select('room_id')
        .eq('user_id', user.id)

      const roomIds = memberData?.map(m => m.room_id) || []
      if (roomIds.length === 0) {
        setUserChats([])
        return
      }

      // Obtener chats de viajes
      const { data: tripsData } = await supabase
        .from('chat_rooms')
        .select(`id, name, trip_id, is_private, trips(name, destination)`)
        .in('id', roomIds)
        .not('trip_id', 'is', null)

      const tripChats = (tripsData || []).map(room => ({
        id: room.id,
        name: room.trips?.destination ? room.trips.destination.split(',')[0].trim() : room.name,
        type: 'trip'
      }))

      // Obtener chats privados
      const { data: privateData } = await supabase
        .from('chat_rooms')
        .select('id, name, is_private')
        .in('id', roomIds)
        .eq('is_private', true)

      const privateChats = []
      for (const room of privateData || []) {
        // Obtener el otro usuario del chat
        const { data: members } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('room_id', room.id)
          .neq('user_id', user.id)

        if (members && members.length > 0) {
          const otherUserId = members[0].user_id
          const { data: userData } = await supabase
            .from('User')
            .select('nombre, apellido, avatar_url')
            .eq('userid', otherUserId)
            .single()

          if (userData) {
            privateChats.push({
              id: room.id,
              name: `${userData.nombre} ${userData.apellido}`,
              type: 'private',
              avatar: userData.avatar_url
            })
          }
        }
      }

      setUserChats([...tripChats, ...privateChats])
    } catch (error) {
      console.error('Error loading chats:', error)
    }
  }

  const shareToChat = async (chatId) => {
    try {
      if (!selectedPost || !user?.id) return

      const sharedPostData = {
        post_id: selectedPost.id,
        content: selectedPost.content,
        author: {
          nombre: selectedPost.author?.nombre,
          apellido: selectedPost.author?.apellido,
          avatar_url: selectedPost.author?.avatar_url
        },
        media: {
          image_url: selectedPost.image_url,
          video_url: selectedPost.video_url
        },
        likes_count: selectedPost.likes_count || 0,
        comments_count: selectedPost.comments_count || 0
      }

      const messageContent = `📱 Post compartido de ${selectedPost.author?.nombre} ${selectedPost.author?.apellido}`

      const { error } = await supabase
        .from('chat_messages')
        .insert({
          id: crypto.randomUUID(),
          room_id: chatId,
          user_id: user.id,
          content: messageContent,
          created_at: new Date().toISOString(),
          file_url: JSON.stringify(sharedPostData),
          file_type: 'shared_post',
          is_file: false
        })

      if (!error) {
        alert('Post compartido exitosamente!')
        setShowShareModal(false)
        setSelectedPost(null)
      } else {
        console.error('Error sharing post:', error)
        alert('Error al compartir el post')
      }
    } catch (error) {
      console.error('Error sharing to chat:', error)
      alert('Error al compartir el post')
    }
  }

  const openStoryModal = () => {
    setShowStoryModal(true)
  }

  const closeStoryModal = () => {
    setShowStoryModal(false)
    setStoryFile(null)
    setStoryPreview(null)
    setStoryContent('')
  }

  const handleStoryFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert('Solo se permiten imágenes y videos')
        return
      }

      setStoryFile(file)
      
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setStoryPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const createStory = async () => {
    try {
      if (!user?.id) {
        alert('Debes iniciar sesión para crear una historia')
        return
      }

      if (!storyFile) {
        alert('Debes seleccionar una imagen o video')
        return
      }

      setUploadingStory(true)

      // Crear FormData
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('content', storyContent)
      formData.append('file', storyFile)

      // Enviar al backend
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.STORIES)
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Historia creada:', result)
        alert('¡Historia creada exitosamente!')
        closeStoryModal()
        // Recargar stories después de un pequeño delay para asegurar que se guardó
        setTimeout(() => {
          loadStories()
        }, 500)
      } else {
        const errorData = await response.json()
        console.error('Error al crear historia:', errorData)
        alert(`Error: ${errorData.error || 'No se pudo crear la historia'}`)
      }
    } catch (error) {
      console.error('Error creating story:', error)
      alert('Error al crear la historia')
    } finally {
      setUploadingStory(false)
    }
  }

  const insertEmoji = (postId, emoji) => {
    setNewComment(prev => ({
      ...prev,
      [postId]: (prev[postId] || '') + emoji
    }))
    setShowEmojiPicker(prev => ({
      ...prev,
      [postId]: false
    }))
  }

  const goToUserProfile = (userId) => {
    navigate(`/profile/${userId}`)
  }

  const handleSendFriendRequest = async (receiverId) => {
    if (!user?.id) return
    
    try {
      // Primero verificar si existe una solicitud rechazada o eliminada
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${user.id})`)
        .maybeSingle()

      if (existingRequest) {
        // Si existe y está rechazada, actualizar a pending
        if (existingRequest.status === 'rejected') {
          const { error: updateError } = await supabase
            .from('friend_requests')
            .update({ 
              status: 'pending',
              sender_id: user.id,
              receiver_id: receiverId,
              created_at: new Date().toISOString()
            })
            .eq('id', existingRequest.id)

          if (updateError) {
            console.error('Error actualizando solicitud:', updateError)
            throw updateError
          }
        } else if (existingRequest.status === 'pending') {
          // Ya está pendiente, no hacer nada
          return
        }
      } else {
        // No existe, crear una nueva
        await sendFriendRequest(user.id, receiverId)
      }
      
      // Actualizar el estado local
      setFriendshipStatuses(prev => ({
        ...prev,
        [receiverId]: 'pending'
      }))
    } catch (error) {
      console.error('Error sending friend request:', error)
      alert('Error al enviar la solicitud de amistad')
    }
  }

  const openStoryViewer = (storyIndex) => {
    if (stories.length > 0) {
      setCurrentStoryIndex(storyIndex)
      setCurrentStory(stories[storyIndex])
      setShowStoryViewer(true)
    }
  }

  const closeStoryViewer = () => {
    setShowStoryViewer(false)
    setCurrentStory(null)
    setCurrentStoryIndex(0)
  }

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      setCurrentStoryIndex(nextIndex)
      setCurrentStory(stories[nextIndex])
    } else {
      closeStoryViewer()
    }
  }

  const prevStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      setCurrentStoryIndex(prevIndex)
      setCurrentStory(stories[prevIndex])
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="pt-6 md:pt-10 pb-20 md:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
            {/* Feed Principal */}
            <div className="w-full max-w-[630px] mx-auto xl:mx-0">
              {/* Stories */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 mb-6 shadow-2xl">
              <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-1">
                {/* Tu Story */}
                <div 
                  onClick={openStoryModal}
                  className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 p-[2.5px] group-hover:scale-110 transition-all duration-300 shadow-lg shadow-blue-500/30">
                      <div className="w-full h-full rounded-full bg-slate-900 p-[2.5px]">
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {user?.avatar_url ? (
                            <img 
                              src={user.avatar_url} 
                              alt={user.nombre || 'Tu perfil'}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                              <span className="text-white font-bold text-xl">
                                {user?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                              </span>
            </div>
                          )}
          </div>
        </div>
      </div>
                    <div className="absolute bottom-0 right-0 w-7 h-7 bg-blue-500 rounded-full border-3 border-slate-900 flex items-center justify-center shadow-lg">
                      <Plus className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <span className="text-xs text-slate-200 font-semibold">Tu historia</span>
                </div>

                {/* Stories de otros usuarios */}
                {stories.map((story, index) => (
                  <div 
                    key={story.id} 
                    onClick={() => openStoryViewer(index)}
                    className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                  >
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-[2.5px] group-hover:scale-110 transition-all duration-300 shadow-lg shadow-pink-500/30">
                      <div className="w-full h-full rounded-full bg-slate-900 p-[2.5px]">
                        <div className="w-full h-full rounded-full overflow-hidden">
                          {story.author?.avatar_url ? (
                            <img 
                              src={story.author.avatar_url} 
                              alt={story.author.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-600 to-orange-600 flex items-center justify-center">
                              <span className="text-white font-bold text-xl">
                                {story.author?.nombre?.charAt(0) || 'U'}
                              </span>
              </div>
            )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-200 font-semibold truncate w-20 text-center">
                      {story.author?.nombre || 'Usuario'}
                    </span>
                  </div>
                ))}
              </div>
              </div>

              {/* Posts Feed */}
              <div className="space-y-6 pb-8">
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-slate-400 mt-4">Cargando posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-24 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-slate-200 text-xl font-bold mb-2">Nada nuevo por acá</p>
                  <p className="text-slate-400 text-sm">¡Sé el primero en compartir algo increíble!</p>
              </div>
            ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl overflow-hidden hover:border-slate-600/70 transition-all duration-300 shadow-2xl hover:shadow-blue-500/10">
                    {/* Post Header */}
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-blue-500/30 shadow-lg">
                          {post.author?.avatar_url ? (
                            <img 
                              src={post.author.avatar_url} 
                              alt={post.author.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                              {post.author?.nombre?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-white font-bold text-sm">
                            {post.author?.nombre} {post.author?.apellido}
                          </p>
                            {post.location && (
                            <p className="text-slate-400 text-xs">{post.location}</p>
                          )}
                        </div>
                      </div>
                      {/* Botón de opciones */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                          className="text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800/50 rounded-full"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {/* Menú desplegable */}
                        {showPostMenu === post.id && (
                          <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 min-w-[180px]">
                            {/* Solo mostrar eliminar si es el autor */}
                            {post.user_id === user?.id && (
                              <button
                                onClick={() => confirmDeletePost(post.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-700 transition-colors text-sm font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar post
                              </button>
                            )}
                            <button
                              onClick={() => setShowPostMenu(null)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-700 transition-colors text-sm font-medium border-t border-slate-700"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Post Image/Video */}
                    {post.image_url && (
                      <div className="w-full aspect-square bg-slate-950">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {post.video_url && (
                      <div className="w-full aspect-square bg-slate-950">
                        <video
                          src={post.video_url}
                          controls
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="px-5 pb-4">
                      <div className="flex items-center justify-between mb-4 pt-2">
                        <div className="flex items-center gap-5">
                        <button
                          onClick={() => likePost(post.id)}
                            className="hover:scale-125 transition-all duration-200 active:scale-95"
                          >
                            <Heart 
                              className={`w-7 h-7 ${likedPosts.has(post.id) ? 'fill-red-500 text-red-500 animate-pulse' : 'text-slate-300 hover:text-red-400'}`}
                            />
                          </button>
                          <button 
                            onClick={() => toggleComments(post.id)}
                            className="text-slate-300 hover:text-blue-400 hover:scale-125 transition-all duration-200 active:scale-95"
                          >
                            <MessageCircle className="w-7 h-7" />
                          </button>
                          <button 
                            onClick={() => sharePost(post)}
                            className="text-slate-300 hover:text-emerald-400 hover:scale-125 transition-all duration-200 active:scale-95"
                          >
                            <Send className="w-7 h-7" />
                          </button>
                        </div>
                        <button className="text-slate-300 hover:text-yellow-400 hover:scale-125 transition-all duration-200 active:scale-95">
                          <Bookmark className="w-7 h-7" />
                        </button>
                      </div>

                      {/* Likes Count */}
                      <p className="text-white font-bold text-sm mb-3">
                        {post.likes_count || 0} Me gusta
                      </p>

                      {/* Post Caption */}
                      {post.content && (
                        <p className="text-slate-200 text-sm leading-relaxed mb-2">
                          <span className="font-bold text-white mr-2">
                            {post.author?.nombre}
                          </span>
                          {post.content}
                        </p>
                      )}

                      {/* Comments Count */}
                      {post.comments_count > 0 && (
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="text-slate-400 hover:text-slate-200 text-sm font-medium transition-colors"
                        >
                          Ver los {post.comments_count} comentarios
                        </button>
                      )}

                      {/* Comments Section */}
                      {showComments[post.id] && (
                        <div className="mt-4 space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                          {comments[post.id]?.map((comment, idx) => (
                            <div key={idx} className="flex gap-3">
                              <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0">
                                {comment.author?.avatar_url ? (
                                  <img 
                                    src={comment.author.avatar_url} 
                                    alt={comment.author.nombre}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                                    {comment.author?.nombre?.charAt(0) || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="font-bold text-white mr-2">
                                    {comment.author?.nombre || 'Usuario'}
                                  </span>
                                  <span className="text-slate-200">{comment.content}</span>
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Comment */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700/50 relative">
                        <div className="relative">
                          <button 
                            onClick={() => setShowEmojiPicker(prev => ({
                              ...prev,
                              [post.id]: !prev[post.id]
                            }))}
                            className="text-slate-400 hover:text-yellow-400 transition-colors"
                          >
                            <Smile className="w-6 h-6" />
                          </button>
                          
                          {/* Emoji Picker Simple */}
                          {showEmojiPicker[post.id] && (
                            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-xl p-3 shadow-2xl z-50 w-64">
                              <div className="grid grid-cols-8 gap-2">
                                {['😀', '😂', '😍', '🥰', '😎', '🤔', '😢', '😭', '😡', '👍', '👏', '🙌', '❤️', '💯', '🔥', '✨', '🎉', '🌟', '⭐', '💪', '🙏', '👌', '✌️', '🤝', '💖', '💕', '💗', '💓', '🎊', '🎈', '🌈', '☀️'].map((emoji, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => insertEmoji(post.id, emoji)}
                                    className="text-2xl hover:scale-125 transition-transform"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <input 
                          type="text"
                          placeholder="Agrega un comentario..."
                          value={newComment[post.id] || ''}
                          onChange={(e) => setNewComment(prev => ({
                            ...prev,
                            [post.id]: e.target.value
                          }))}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              createComment(post.id)
                            }
                          }}
                          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-slate-500 focus:placeholder-slate-400"
                        />
                        <button 
                          onClick={() => createComment(post.id)}
                          className="text-blue-500 hover:text-blue-400 font-bold text-sm transition-colors"
                        >
                          Publicar
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              </div>
      </div>

          {/* Sidebar Derecho - Sugerencias */}
          <div className="hidden xl:block">
            <div className="sticky top-24 space-y-5">
              {/* Tu Perfil */}
              <div 
                className="flex items-center justify-between p-4 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl cursor-pointer hover:border-blue-500/50 transition-all duration-300 shadow-xl hover:shadow-blue-500/20 group"
                onClick={() => navigate('/profile')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl ring-2 ring-blue-500/30 shadow-lg group-hover:scale-110 transition-transform">
                    {user?.avatar_url ? (
                      <img 
                        src={user.avatar_url} 
                        alt={user.nombre || 'Tu perfil'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{user?.nombre?.charAt(0)?.toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</span>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">
                      {user?.nombre && user?.apellido 
                        ? `${user.nombre} ${user.apellido}` 
                        : user?.email?.split('@')[0] || 'Usuario'}
                    </p>
                    <p className="text-blue-400 text-xs font-medium">Ver perfil</p>
                  </div>
                </div>
            </div>

              {/* Sugerencias de Usuarios */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-white font-bold text-sm">Sugerencias para ti</p>
                  <button className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors">
                    Ver todo
                  </button>
                </div>
            <div className="space-y-4">
                  {suggestedUsers.slice(0, 5).map((suggestedUser) => (
                    <div key={suggestedUser.userid} className="flex items-center justify-between group">
                      <div 
                        onClick={() => goToUserProfile(suggestedUser.userid)}
                        className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-br from-emerald-500 to-cyan-600 ring-2 ring-emerald-500/20 shadow-md group-hover:scale-110 transition-transform flex-shrink-0">
                          {suggestedUser.avatar_url ? (
                            <img 
                              src={suggestedUser.avatar_url} 
                              alt={suggestedUser.nombre}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-base">
                              {suggestedUser.nombre?.charAt(0) || 'U'}
          </div>
        )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-sm truncate">
                            {suggestedUser.nombre} {suggestedUser.apellido}
                          </p>
                          <p className="text-slate-400 text-xs truncate">
                            {suggestedUser.bio ? suggestedUser.bio.substring(0, 20) + '...' : 'Nuevo en JetGo'}
                          </p>
                        </div>
                      </div>
                      {friendshipStatuses[suggestedUser.userid] === 'accepted' ? (
                        <button 
                          className="text-green-400 font-bold text-xs transition-colors flex-shrink-0 px-4 py-1.5 bg-green-500/10 rounded-lg flex items-center gap-1.5 cursor-default"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Amigos
                        </button>
                      ) : friendshipStatuses[suggestedUser.userid] === 'pending' ? (
                        <button 
                          className="text-yellow-400 font-bold text-xs transition-colors flex-shrink-0 px-4 py-1.5 bg-yellow-500/10 rounded-lg cursor-not-allowed"
                          disabled
                        >
                          Pendiente
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleSendFriendRequest(suggestedUser.userid)}
                          className="text-blue-400 hover:text-blue-300 font-bold text-xs transition-colors flex-shrink-0 px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg flex items-center gap-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Agregar
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Sugerencias de Viajes */}
              <div className="bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-white font-bold text-sm">Viajes sugeridos</p>
                  <button className="text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors">
                    Ver todo
                  </button>
                </div>
                <div className="space-y-4">
                  {suggestedTrips.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-slate-400 text-sm">No hay viajes disponibles</p>
                      <button 
                        onClick={() => navigate('/viajes')}
                        className="mt-3 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                      >
                        Explorar viajes
                      </button>
                    </div>
                  ) : (
                    suggestedTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="bg-slate-800/50 rounded-xl overflow-hidden cursor-pointer hover:bg-slate-800 transition-all duration-300 border border-slate-700/50 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 group"
                      onClick={() => navigate(`/trip/${trip.id}`)}
                    >
                      {trip.image_url && (
                        <div className="relative overflow-hidden">
                          <img 
                            src={trip.image_url} 
                            alt={trip.name}
                            className="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent"></div>
                        </div>
                      )}
                      <div className="p-3">
                        <p className="text-white font-bold text-sm mb-1">{trip.name}</p>
                        <p className="text-slate-400 text-xs mb-2">{trip.destination}</p>
                        {trip.budget_min && (
                          <div className="inline-block px-3 py-1 bg-emerald-500/20 rounded-full">
                            <p className="text-emerald-400 text-xs font-bold">
                              Desde ${trip.budget_min}
                            </p>
                </div>
              )}
                      </div>
                    </div>
                  ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Modal de Compartir */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 rounded-2xl max-w-md w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Compartir post</h3>
              <button
                onClick={() => {
                  setShowShareModal(false)
                  setSelectedPost(null)
                }}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Lista de Chats */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {userChats.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-sm">No tienes chats disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => shareToChat(chat.id)}
                      className="w-full flex items-center gap-3 p-4 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl transition-all duration-200 border border-slate-700/30 hover:border-blue-500/50"
                    >
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 flex items-center justify-center">
                        {chat.avatar ? (
                          <img 
                            src={chat.avatar} 
                            alt={chat.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">
                            {chat.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-white font-semibold text-sm">
                          {chat.name}
                        </p>
                        <p className="text-slate-400 text-xs">
                          {chat.type === 'trip' ? 'Chat de viaje' : 'Chat privado'}
                        </p>
                      </div>
                      <Send className="w-5 h-5 text-blue-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal para crear Story */}
      {showStoryModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 border-b border-slate-700/50 flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">Crear historia</h3>
              <button 
                onClick={closeStoryModal}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* File Input */}
              <div className="mb-5">
                <label className="block text-white font-semibold mb-3">
                  Selecciona una imagen o video
                </label>
                  <input
                    type="file"
                  accept="image/*,video/*"
                  onChange={handleStoryFileChange}
                    className="hidden"
                  id="story-file-input"
                />
                <label
                  htmlFor="story-file-input"
                  className="block w-full p-4 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 transition-colors text-center"
                >
                  <div className="text-slate-400 text-sm">
                    {storyFile ? storyFile.name : 'Click para seleccionar archivo'}
                  </div>
                </label>
              </div>

              {/* Preview */}
              {storyPreview && (
                <div className="mb-5">
                  <label className="block text-white font-semibold mb-3">
                    Vista previa
                  </label>
                  <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden">
                    {storyFile?.type.startsWith('image/') ? (
                      <img 
                        src={storyPreview} 
                    alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <video 
                        src={storyPreview}
                        controls
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Text Content */}
              <div className="mb-5">
                <label className="block text-white font-semibold mb-3">
                  Agrega un texto (opcional)
                </label>
                <textarea
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Escribe algo sobre tu historia..."
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                  rows="3"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-700/50 flex gap-3">
              <button
                onClick={closeStoryModal}
                className="flex-1 px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createStory}
                disabled={!storyFile || uploadingStory}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingStory ? 'Subiendo...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver Story */}
      {showStoryViewer && currentStory && (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          {/* Botón cerrar */}
          <button
            onClick={closeStoryViewer}
            className="absolute top-6 right-6 z-50 text-white hover:text-red-400 transition-colors"
          >
            <X className="w-8 h-8" />
          </button>

          {/* Botón anterior */}
          {currentStoryIndex > 0 && (
            <button
              onClick={prevStory}
              className="absolute left-6 z-50 text-white hover:scale-110 transition-transform bg-black/30 rounded-full p-2"
            >
              <ChevronLeft className="w-10 h-10" />
            </button>
          )}

          {/* Contenido de la story */}
          <div className="relative w-full max-w-md h-[90vh] bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            {/* Header con info del usuario */}
            <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent p-4">
              <div 
                className="flex items-center gap-3 cursor-pointer hover:bg-white/10 rounded-lg p-2 -m-2 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  console.log('Click en perfil de usuario')
                  console.log('Author completo:', currentStory.author)
                  const authorId = currentStory.author?.userid || currentStory.author?.user_id || currentStory.author?.id || currentStory.user_id
                  console.log('Author ID encontrado:', authorId)
                  if (authorId) {
                    closeStoryViewer()
                    navigate(`/profile/${authorId}`)
                  } else {
                    console.error('No se encontró ID del autor. Story:', currentStory)
                  }
                }}
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-white/30">
                  {currentStory.author?.avatar_url ? (
                    <img 
                      src={currentStory.author.avatar_url} 
                      alt={currentStory.author.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold">
                      {currentStory.author?.nombre?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">
                    {currentStory.author?.nombre} {currentStory.author?.apellido}
                  </p>
                  <p className="text-white/70 text-xs">
                    {new Date(currentStory.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="flex gap-1 mt-3">
                {stories.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-0.5 flex-1 rounded-full ${
                      idx === currentStoryIndex ? 'bg-white' : 
                      idx < currentStoryIndex ? 'bg-white/80' : 'bg-white/30'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Media (imagen o video) */}
            <div className="w-full h-full flex items-center justify-center bg-black">
              {currentStory.media_type === 'image' ? (
                <img 
                  src={currentStory.media_url} 
                  alt="Story"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <video 
                  src={currentStory.media_url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Texto de la story (si existe) */}
            {currentStory.content && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                <p className="text-white text-lg text-center">
                  {currentStory.content}
                </p>
              </div>
            )}
          </div>

          {/* Botón siguiente */}
          {currentStoryIndex < stories.length - 1 && (
            <button
              onClick={nextStory}
              className="absolute right-6 z-50 text-white hover:scale-110 transition-transform bg-black/30 rounded-full p-2"
            >
              <ChevronRight className="w-10 h-10" />
            </button>
          )}
        </div>
      )}

      {/* Modal de confirmación para eliminar post */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border-b border-red-500/30 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="bg-red-500/20 p-2 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Eliminar Post</h3>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-slate-300 text-base leading-relaxed">
                ¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.
              </p>
            </div>

            {/* Footer */}
            <div className="bg-slate-800/50 px-6 py-4 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setPostToDelete(null)
                }}
                className="px-6 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={deletePost}
                className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
