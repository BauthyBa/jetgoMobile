import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/services/supabase'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile, Plus, ChevronLeft, ChevronRight, X, UserPlus, UserCheck, Trash2, Loader2, MapPin, CheckCircle2, PartyPopper, Sparkles } from 'lucide-react'
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
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0)
  const [friendshipStatuses, setFriendshipStatuses] = useState({})
  const [showPostMenu, setShowPostMenu] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [showCreatePostModal, setShowCreatePostModal] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostFile, setNewPostFile] = useState(null)
  const [newPostPreview, setNewPostPreview] = useState(null)
  const [creatingPost, setCreatingPost] = useState(false)
  const [showStoryToast, setShowStoryToast] = useState(false)
  const [storyProgress, setStoryProgress] = useState(0)
  const [newPostLocation, setNewPostLocation] = useState('')
  const [postSuccessMessage, setPostSuccessMessage] = useState(null)
  const STORY_IMAGE_DURATION = 5000
  const STORY_VIDEO_DURATION = 15000
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
  useEffect(() => {
    const handleCreatePostRequest = () => {
      if (!user?.id) {
        alert('Debes iniciar sesión para crear un post')
        navigate('/login')
        return
      }
      setShowCreatePostModal(true)
    }
    window.addEventListener('social:create-post', handleCreatePostRequest)
    return () => {
      window.removeEventListener('social:create-post', handleCreatePostRequest)
    }
  }, [user, navigate])
useEffect(() => {
  return () => {
    if (newPostPreview) {
      URL.revokeObjectURL(newPostPreview)
    }
  }
}, [newPostPreview])
  useEffect(() => {
    if (!postSuccessMessage) return
    const timer = window.setTimeout(() => setPostSuccessMessage(null), 4000)
    return () => window.clearTimeout(timer)
  }, [postSuccessMessage])
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
  const normalizePost = (post) => ({
    ...post,
    likes_count: post?.likes_count ?? 0,
    comments_count: post?.comments_count ?? 0,
  })
  const fetchPostsFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
            id,
            user_id,
            content,
            image_url,
            video_url,
            location,
            is_public,
            created_at,
            updated_at,
            author:User!posts_user_fk (
              userid,
              nombre,
              apellido,
              avatar_url
            )
          `,
        )
        .is('deleted_at', null)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      const mapped = (data || []).map((item) => ({
        ...item,
        author: item.author || {},
      }))
      setPosts(mapped.map(normalizePost))
    } catch (supabaseError) {
      console.error('Error loading posts from Supabase:', supabaseError)
    } finally {
      setLoading(false)
    }
  }
  const loadPosts = async () => {
    setLoading(true)
    try {
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Status ${response.status}`)
      }
      const data = await response.json()
      if (!data || !Array.isArray(data.posts)) {
        throw new Error('Respuesta de posts inválida')
      }
      setPosts(data.posts.map(normalizePost))
      setLoading(false)
    } catch (error) {
      console.warn('Falla al cargar posts vía API, usando Supabase directo:', error?.message || error)
      await fetchPostsFromSupabase()
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
  const groupedStories = useMemo(() => {
    if (!stories || stories.length === 0) return []
    const groupsMap = new Map()
    const order = []
    stories.forEach((story) => {
      const author = story.author || {}
      const userId =
        author?.userid ||
        story.user_id ||
        author?.id ||
        `story-${story.id}`
      if (!groupsMap.has(userId)) {
        const group = {
          userId,
          author,
          stories: [],
        }
        groupsMap.set(userId, group)
        order.push(group)
      }
      const group = groupsMap.get(userId)
      if (!group.author || !group.author.userid) {
        group.author = author
      }
      group.stories.push(story)
    })
    order.forEach((group) => {
      group.stories.sort((a, b) => {
        const dateA = new Date(a.created_at || 0).getTime()
        const dateB = new Date(b.created_at || 0).getTime()
        return dateA - dateB
      })
    })
    return order
  }, [stories])
  const otherStoryGroups = useMemo(() => {
    const currentUserId = user?.userid ? String(user.userid) : null
    return groupedStories
      .map((group, index) => ({ group, index }))
      .filter(({ group }) => {
        if (!currentUserId) return true
        const groupId = group.userId != null ? String(group.userId) : null
        return groupId !== currentUserId
      })
  }, [groupedStories, user?.userid])
  const ownStoryGroupIndex = useMemo(() => {
    const currentUserId = user?.userid ? String(user.userid) : null
    if (!currentUserId) return -1
    return groupedStories.findIndex((group) => {
      const groupId = group.userId != null ? String(group.userId) : null
      return groupId === currentUserId
    })
  }, [groupedStories, user?.userid])
  const ownStoriesCount =
    ownStoryGroupIndex >= 0 ? groupedStories[ownStoryGroupIndex]?.stories?.length || 0 : 0
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
  const removePostFile = () => {
    setNewPostFile(null)
    setNewPostPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    if (typeof document !== 'undefined') {
      const input = document.getElementById('create-post-file-input')
      if (input) {
        input.value = ''
      }
    }
  }
  const resetCreatePostForm = () => {
    setNewPostContent('')
    setNewPostLocation('')
    removePostFile()
  }
  const closeCreatePostModal = () => {
    setShowCreatePostModal(false)
    resetCreatePostForm()
  }
  const handlePostFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      alert('Solo se permiten imágenes o videos')
      return
    }
    setNewPostFile(file)
    setNewPostPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return URL.createObjectURL(file)
    })
    event.target.value = ''
  }
  const createPostViaSupabase = async (content, location) => {
    let uploadWarning = null
    let mediaUrl = null
    let mediaField = null
    if (newPostFile) {
      try {
        const extension = newPostFile.name.split('.').pop()
        const objectName = `${user.id}/${Date.now()}.${extension}`
        const { data, error: uploadError } = await supabase.storage
          .from('jetgo-posts')
          .upload(objectName, newPostFile, {
            cacheControl: '3600',
            upsert: false,
          })
        if (uploadError) throw uploadError
        const { data: publicUrlData } = supabase.storage
          .from('jetgo-posts')
          .getPublicUrl(data.path)
        mediaUrl = publicUrlData?.publicUrl || null
        if (mediaUrl) {
          mediaField = newPostFile.type.startsWith('video/') ? 'video_url' : 'image_url'
        }
      } catch (storageError) {
        console.warn('No se pudo subir el archivo, se publicará solo el texto:', storageError)
        mediaUrl = null
        mediaField = null
        uploadWarning = 'El archivo adjunto no pudo subirse. Se publicó solo el texto.'
      }
    }
    const insertPayload = {
      user_id: user.id,
      content,
      is_public: true,
    }
    if (mediaUrl && mediaField) {
      insertPayload[mediaField] = mediaUrl
    }
    if (location) {
      insertPayload.location = location
    }
    const { error: insertError } = await supabase.from('posts').insert(insertPayload)
    if (insertError) throw insertError
    return { warning: uploadWarning }
  }
  const createPost = async () => {
    if (!user?.id) {
      alert('Debes iniciar sesión para crear un post')
      navigate('/login')
      return
    }
    const content = newPostContent.trim()
    const location = newPostLocation.trim()
    if (!content && !newPostFile) {
      alert('Escribí algo o agrega una imagen/video antes de publicar')
      return
    }
    try {
      setCreatingPost(true)
      const formData = new FormData()
      formData.append('user_id', user.id)
      formData.append('content', content)
      if (location) {
        formData.append('location', location)
      }
      if (newPostFile) {
        formData.append('file', newPostFile)
      }
      const url = API_CONFIG.getEndpointUrl(API_CONFIG.SOCIAL_ENDPOINTS.POSTS)
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) {
        throw new Error('API_POST_FAILED')
      }
      await response.json().catch(() => null)
      closeCreatePostModal()
      await loadPosts()
      setPostSuccessMessage('¡Post publicado!')
    } catch (error) {
      try {
        const { warning } = await createPostViaSupabase(content, location)
        closeCreatePostModal()
        await fetchPostsFromSupabase()
        setPostSuccessMessage(warning ? `Post publicado. ${warning}` : '¡Post publicado!')
      } catch (fallbackError) {
        console.error('Error creando post:', fallbackError)
        alert(fallbackError?.message || error?.message || 'Error al crear el post')
      }
    } finally {
      setCreatingPost(false)
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
  const showStorySuccessToast = () => {
    setShowStoryToast(true)
    window.setTimeout(() => {
      setShowStoryToast(false)
    }, 3200)
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
        showStorySuccessToast()
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
  const closeStoryViewer = useCallback(() => {
    setShowStoryViewer(false)
    setCurrentStory(null)
    setCurrentStoryIndex(0)
    setCurrentGroupIndex(0)
    setStoryProgress(0)
  }, [])
  const openStoryViewer = useCallback(
    (groupIndex, storyIndex = 0) => {
      const group = groupedStories[groupIndex]
      if (!group || group.stories.length === 0) return
      const clampedIndex = Math.min(Math.max(storyIndex, 0), group.stories.length - 1)
      setCurrentGroupIndex(groupIndex)
      setCurrentStoryIndex(clampedIndex)
      setCurrentStory(group.stories[clampedIndex])
      setStoryProgress(0)
      setShowStoryViewer(true)
    },
    [groupedStories],
  )

  const handleOwnStoryCircleClick = useCallback(() => {
    if (ownStoryGroupIndex >= 0 && groupedStories[ownStoryGroupIndex]?.stories?.length > 0) {
      openStoryViewer(ownStoryGroupIndex)
    } else {
      openStoryModal()
    }
  }, [ownStoryGroupIndex, groupedStories, openStoryViewer, openStoryModal])
  const nextStory = useCallback(() => {
    const group = groupedStories[currentGroupIndex]
    if (!group || group.stories.length === 0) {
      closeStoryViewer()
      return
    }
    if (currentStoryIndex < group.stories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      setCurrentStoryIndex(nextIndex)
      setCurrentStory(group.stories[nextIndex])
      setStoryProgress(0)
      return
    }
    let nextGroupIndex = currentGroupIndex + 1
    while (
      nextGroupIndex < groupedStories.length &&
      groupedStories[nextGroupIndex].stories.length === 0
    ) {
      nextGroupIndex += 1
    }
    if (nextGroupIndex < groupedStories.length) {
      const nextGroup = groupedStories[nextGroupIndex]
      setCurrentGroupIndex(nextGroupIndex)
      setCurrentStoryIndex(0)
      setCurrentStory(nextGroup.stories[0])
      setStoryProgress(0)
    } else {
      closeStoryViewer()
    }
  }, [groupedStories, currentGroupIndex, currentStoryIndex, closeStoryViewer])
  const prevStory = useCallback(() => {
    const group = groupedStories[currentGroupIndex]
    if (!group || group.stories.length === 0) return
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      setCurrentStoryIndex(prevIndex)
      setCurrentStory(group.stories[prevIndex])
      setStoryProgress(0)
      return
    }
    if (currentGroupIndex === 0) return
    let prevGroupIndex = currentGroupIndex - 1
    while (prevGroupIndex >= 0 && groupedStories[prevGroupIndex].stories.length === 0) {
      prevGroupIndex -= 1
    }
    if (prevGroupIndex >= 0) {
      const prevGroup = groupedStories[prevGroupIndex]
      const lastIndex = Math.max(prevGroup.stories.length - 1, 0)
      setCurrentGroupIndex(prevGroupIndex)
      setCurrentStoryIndex(lastIndex)
      setCurrentStory(prevGroup.stories[lastIndex])
      setStoryProgress(0)
    }
  }, [groupedStories, currentGroupIndex, currentStoryIndex])
  useEffect(() => {
    if (!showStoryViewer) return
    const group = groupedStories[currentGroupIndex]
    if (!group || group.stories.length === 0) {
      closeStoryViewer()
      return
    }
    const safeIndex = Math.min(currentStoryIndex, group.stories.length - 1)
    if (safeIndex !== currentStoryIndex) {
      setCurrentStoryIndex(safeIndex)
      setCurrentStory(group.stories[safeIndex])
    } else if (!currentStory || currentStory.id !== group.stories[safeIndex]?.id) {
      setCurrentStory(group.stories[safeIndex])
    }
  }, [
    groupedStories,
    currentGroupIndex,
    currentStoryIndex,
    showStoryViewer,
    closeStoryViewer,
    currentStory,
  ])
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (!showStoryViewer || !currentStory) {
      setStoryProgress(0)
      return undefined
    }
    setStoryProgress(0)
    let animationFrameId
    let startTimestamp = 0
    const duration =
      currentStory.media_type === 'video' ? STORY_VIDEO_DURATION : STORY_IMAGE_DURATION
    const tick = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const elapsed = timestamp - startTimestamp
      const progress = Math.min(elapsed / duration, 1)
      setStoryProgress(progress)
      if (progress >= 1) {
        nextStory()
        return
      }
      animationFrameId = window.requestAnimationFrame(tick)
    }
    animationFrameId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animationFrameId)
  }, [showStoryViewer, currentStory, nextStory])
  const currentGroupStories =
    groupedStories[currentGroupIndex]?.stories || []
  const nextAvailableGroupIndex = useMemo(() => {
    for (let i = currentGroupIndex + 1; i < groupedStories.length; i += 1) {
      if (groupedStories[i]?.stories?.length) return i
    }
    return -1
  }, [groupedStories, currentGroupIndex])
  const prevAvailableGroupIndex = useMemo(() => {
    for (let i = currentGroupIndex - 1; i >= 0; i -= 1) {
      if (groupedStories[i]?.stories?.length) return i
    }
    return -1
  }, [groupedStories, currentGroupIndex])
  const hasPrevStory =
    currentStoryIndex > 0 || prevAvailableGroupIndex !== -1
  const hasNextStory =
    currentStoryIndex < currentGroupStories.length - 1 ||
    nextAvailableGroupIndex !== -1
  return (
    <div className="min-h-screen bg-gradient-hero text-slate-900 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white">
      {showStoryToast && (
        <div className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-emerald-300/40 bg-white/90 backdrop-blur-xl shadow-[0_20px_60px_-20px_rgba(16,185,129,0.45)] dark:border-emerald-500/50 dark:bg-slate-900/90">
            <div className="flex items-start gap-4 px-5 py-4">
              <div className="rounded-full bg-emerald-500/20 p-2 text-emerald-500">
                <PartyPopper className="h-5 w-5" />
              </div>
              <div className="flex-1 text-sm">
                <p className="flex items-center gap-2 text-base font-semibold text-emerald-600 dark:text-emerald-300">
                  ¡Historia publicada!
                  <Sparkles className="h-4 w-4" />
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  Tu historia ya está en la portada para que la vea toda la comunidad. ✨
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStoryToast(false)}
                className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-rows-1">
              <span className="h-1 w-full origin-left animate-toast-progress bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-300" />
            </div>
          </div>
        </div>
      )}
      <div className="pb-20 pt-[calc(env(safe-area-inset-top)+3rem)] md:pt-16 md:pb-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8">
            {/* Feed Principal */}
            <div className="w-full max-w-[630px] mx-auto xl:mx-0">
              {/* Stories */}
              <div className="bg-white/90 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl p-5 mb-6 shadow-lg dark:shadow-2xl">
              <div className="flex gap-5 overflow-x-auto scrollbar-hide pb-1">
                {/* Tu Story */}
                <div className="flex flex-col items-center gap-2 flex-shrink-0 group">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleOwnStoryCircleClick}
                      className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 via-purple-500 to-pink-500 p-[2.5px] transition-all duration-300 shadow-lg shadow-blue-500/30 group-hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-400/70"
                    >
                      <div className="w-full h-full rounded-full bg-white p-[2.5px] dark:bg-slate-900">
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
                    </button>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        openStoryModal()
                      }}
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-blue-500 border-3 border-slate-900 flex items-center justify-center shadow-lg hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      aria-label="Agregar historia"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                    {ownStoriesCount > 1 && (
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-blue-500 shadow-md dark:bg-slate-900 dark:text-blue-300">
                        {ownStoriesCount}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-600 font-semibold dark:text-slate-200">Tu historia</span>
                </div>
                {/* Stories de otros usuarios */}
                {otherStoryGroups.map(({ group, index: groupIndex }) => {
                  const preview =
                    group.stories[group.stories.length - 1] || group.stories[0] || {}
                  const author = group.author || preview.author || {}
                  const avatarUrl =
                    author?.avatar_url || preview.author?.avatar_url || preview.avatar_url
                  const displayName =
                    [author?.nombre, author?.apellido].filter(Boolean).join(' ') ||
                    preview.author?.nombre ||
                    'Usuario'
                  return (
                    <div
                      key={group.userId || `story-group-${groupIndex}`}
                      onClick={() => openStoryViewer(groupIndex)}
                      className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
                    >
                      <div className="relative">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 p-[2.5px] group-hover:scale-110 transition-all duration-300 shadow-lg shadow-pink-500/30">
                          <div className="w-full h-full rounded-full bg-white p-[2.5px] dark:bg-slate-900">
                            <div className="w-full h-full rounded-full overflow-hidden">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={displayName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-pink-600 to-orange-600 flex items-center justify-center">
                                  <span className="text-white font-bold text-xl">
                                    {displayName?.charAt(0) || 'U'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {group.stories.length > 1 && (
                          <div className="absolute -bottom-2 -right-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-pink-500 shadow-md dark:bg-slate-900 dark:text-pink-300">
                            {group.stories.length}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-slate-600 font-semibold truncate w-20 text-center dark:text-slate-200">
                        {displayName}
                      </span>
                    </div>
                  )
                })}
              </div>
              </div>
              {/* Posts Feed */}
              <div className="space-y-6 pb-8">
              {loading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-4 text-slate-600 dark:text-slate-400">Cargando posts...</p>
                </div>
              ) : posts.length === 0 ? (
                <div className="text-center py-24 bg-white/90 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl shadow-lg dark:shadow-2xl">
                  <div className="text-6xl mb-4">📱</div>
                  <p className="text-xl font-bold mb-2 text-slate-700 dark:text-slate-100">Nada nuevo por acá</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">¡Sé el primero en compartir algo increíble!</p>
              </div>
            ) : (
                posts.map((post) => (
                  <div key={post.id} className="bg-white/95 text-slate-900 dark:bg-gradient-to-br dark:from-slate-900/90 dark:to-slate-800/90 dark:text-white backdrop-blur-xl border border-slate-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:border-emerald-200/70 dark:hover:border-slate-600/70 transition-all duration-300 shadow-lg hover:shadow-emerald-200/40 dark:shadow-2xl dark:hover:shadow-blue-500/10">
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
                          <p className="font-bold text-sm text-slate-900 dark:text-white">
                          {post.author?.nombre} {post.author?.apellido}
                          </p>
                          {post.location && (
                            <div className="mt-1 flex items-center gap-1 text-slate-500 dark:text-slate-400 text-xs">
                              <MapPin className="h-3 w-3" />
                              <span>{post.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Botón de opciones */}
                      <div className="relative">
                        <button 
                          onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                          className="p-2 text-slate-500 transition-colors rounded-full hover:bg-emerald-50 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/50"
                        >
                          <MoreHorizontal className="w-5 h-5" />
                        </button>
                        
                        {/* Menú desplegable */}
                        {showPostMenu === post.id && (
                          <div className="absolute right-0 top-full mt-1 min-w-[180px] rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xl z-10 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {/* Solo mostrar eliminar si es el autor */}
                            {post.user_id === user?.id && (
                              <button
                                onClick={() => confirmDeletePost(post.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 transition-colors text-sm font-medium hover:bg-red-50 dark:text-red-400 dark:hover:bg-slate-700"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar post
                              </button>
                            )}
                            <button
                              onClick={() => setShowPostMenu(null)}
                              className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 transition-colors text-sm font-medium border-t border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
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
                      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-950">
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    {post.video_url && (
                      <div className="w-full aspect-square bg-slate-100 dark:bg-slate-950">
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
                        <div className="flex items-center gap-5 text-slate-500 dark:text-slate-300">
                        <button
                          onClick={() => likePost(post.id)}
                            className="transition-all duration-200 active:scale-95 hover:scale-125"
                          >
                            <Heart 
                              className={`w-7 h-7 ${likedPosts.has(post.id) ? 'fill-red-500 text-red-500 animate-pulse dark:text-red-400' : 'text-slate-500 hover:text-red-500 dark:text-slate-300 dark:hover:text-red-400'}`}
                            />
                          </button>
                          <button 
                            onClick={() => toggleComments(post.id)}
                            className="transition-all duration-200 active:scale-95 hover:scale-125 hover:text-blue-500 dark:hover:text-blue-400"
                          >
                            <MessageCircle className="w-7 h-7" />
                          </button>
                          <button 
                            onClick={() => sharePost(post)}
                            className="text-slate-500 hover:text-emerald-500 hover:scale-125 transition-all duration-200 active:scale-95 dark:text-slate-300 dark:hover:text-emerald-400"
                          >
                            <Send className="w-7 h-7" />
                          </button>
                        </div>
                        <button className="text-slate-500 hover:text-yellow-500 hover:scale-125 transition-all duration-200 active:scale-95 dark:text-slate-300 dark:hover:text-yellow-400">
                          <Bookmark className="w-7 h-7" />
                        </button>
                      </div>
                      {/* Likes Count */}
                      <p className="mb-3 text-sm font-bold text-slate-800 dark:text-white">
                        {post.likes_count || 0} Me gusta
                      </p>
                      {/* Post Caption */}
                      {post.content && (
                        <p className="mb-2 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
                          <span className="mr-2 font-bold text-slate-900 dark:text-white">
                            {post.author?.nombre}
                          </span>
                          {post.content}
                        </p>
                      )}
                      {/* Comments Count */}
                      {post.comments_count > 0 && (
                        <button 
                          onClick={() => toggleComments(post.id)}
                          className="text-sm font-medium text-slate-600 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-slate-200"
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
                                  <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">
                                    {comment.author?.nombre?.charAt(0) || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">
                                  <span className="mr-2 font-bold text-slate-800 dark:text-white">
                                    {comment.author?.nombre || 'Usuario'}
                                  </span>
                                  <span className="text-slate-700 dark:text-slate-200">{comment.content}</span>
                                </p>
                                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                  {new Date(comment.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Add Comment */}
                      <div className="relative mt-4 flex items-center gap-3 border-t border-slate-200 pt-4 dark:border-slate-700/50">
                        <div className="relative">
                          <button 
                            onClick={() => setShowEmojiPicker(prev => ({
                              ...prev,
                              [post.id]: !prev[post.id]
                            }))}
                            className="text-slate-500 transition-colors hover:text-yellow-500 dark:text-slate-400 dark:hover:text-yellow-400"
                          >
                            <Smile className="w-6 h-6" />
                          </button>
                          
                          {/* Emoji Picker Simple */}
                          {showEmojiPicker[post.id] && (
                            <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-xl border border-slate-200 bg-white p-3 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
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
                          className="flex-1 bg-transparent text-slate-800 text-sm outline-none placeholder-slate-400 focus:placeholder-slate-500 dark:text-white dark:placeholder-slate-500 dark:focus:placeholder-slate-400"
                        />
                        <button 
                          onClick={() => createComment(post.id)}
                          className="text-sm font-bold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-blue-500 dark:hover:text-blue-400"
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
                className="flex items-center justify-between p-4 bg-white/95 text-slate-900 backdrop-blur-xl border border-slate-200 rounded-2xl cursor-pointer transition-all duration-300 shadow-md hover:border-emerald-200 hover:shadow-emerald-200/40 dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/80 dark:text-white dark:border-slate-700/50 dark:hover:border-blue-500/50 dark:shadow-xl dark:hover:shadow-blue-500/20 group"
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
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {user?.nombre && user?.apellido 
                        ? `${user.nombre} ${user.apellido}` 
                        : user?.email?.split('@')[0] || 'Usuario'}
                    </p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-blue-400">Ver perfil</p>
                  </div>
                </div>
            </div>
              {/* Sugerencias de Usuarios */}
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-md backdrop-blur-xl dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/80 dark:text-white dark:border-slate-700/50 dark:shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Sugerencias para ti</p>
                  <button className="text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-blue-400 dark:hover:text-blue-300">
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
                          <p className="text-sm font-bold text-slate-900 truncate dark:text-white">
                            {suggestedUser.nombre} {suggestedUser.apellido}
                          </p>
                          <p className="text-xs text-slate-600 truncate dark:text-slate-400">
                            {suggestedUser.bio ? suggestedUser.bio.substring(0, 20) + '...' : 'Nuevo en JetGo'}
                          </p>
                        </div>
                      </div>
                      {friendshipStatuses[suggestedUser.userid] === 'accepted' ? (
                        <button 
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-emerald-600 transition-colors rounded-lg bg-emerald-500/10 cursor-default dark:text-green-400"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Amigos
                        </button>
                      ) : friendshipStatuses[suggestedUser.userid] === 'pending' ? (
                        <button 
                          className="flex-shrink-0 px-4 py-1.5 text-xs font-bold text-yellow-500 transition-colors rounded-lg bg-yellow-500/10 cursor-not-allowed dark:text-yellow-400"
                          disabled
                        >
                          Pendiente
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleSendFriendRequest(suggestedUser.userid)}
                          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-emerald-600 transition-colors rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 hover:text-emerald-500 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-500/10 dark:hover:bg-blue-500/20"
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
              <div className="rounded-2xl border border-slate-200 bg-white/95 p-5 text-slate-900 shadow-md backdrop-blur-xl dark:bg-gradient-to-br dark:from-slate-900/80 dark:to-slate-800/80 dark:text-white dark:border-slate-700/50 dark:shadow-xl">
                <div className="flex items-center justify-between mb-5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Viajes sugeridos</p>
                  <button className="text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-blue-400 dark:hover:text-blue-300">
                    Ver todo
                  </button>
                </div>
                <div className="space-y-4">
                  {suggestedTrips.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-sm text-slate-600 dark:text-slate-400">No hay viajes disponibles</p>
                      <button 
                        onClick={() => navigate('/viajes')}
                        className="mt-3 text-xs font-bold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Explorar viajes
                      </button>
                    </div>
                  ) : (
                    suggestedTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="rounded-xl border border-slate-200 bg-white overflow-hidden cursor-pointer transition-all duration-300 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-200/40 group dark:bg-slate-800/50 dark:border-slate-700/50 dark:hover:border-blue-500/50 dark:hover:bg-slate-800 dark:hover:shadow-blue-500/10"
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
                        <p className="mb-1 text-sm font-bold text-slate-900 dark:text-white">{trip.name}</p>
                        <p className="mb-2 text-xs text-slate-600 dark:text-slate-400">{trip.destination}</p>
                        {trip.budget_min && (
                          <div className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 dark:bg-emerald-500/20">
                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
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
      {postSuccessMessage && (
        <div className="fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 px-4">
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/60 bg-emerald-500/90 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-5 w-5" />
            <span>{postSuccessMessage}</span>
            <button
              type="button"
              onClick={() => setPostSuccessMessage(null)}
              className="rounded-full bg-white/10 px-2 py-1 text-xs hover:bg-white/20 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
      {/* Modal para crear Post */}
      {showCreatePostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700/50 dark:bg-transparent">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crear publicación</h3>
              <button
                type="button"
                onClick={closeCreatePostModal}
                className="rounded-full p-2 text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[calc(90vh-160px)] space-y-4 overflow-y-auto px-5 py-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  ¿Qué querés compartir?
                </label>
                <textarea
                  value={newPostContent}
                  onChange={(event) => setNewPostContent(event.target.value)}
                  placeholder="Comparte tu experiencia, un anuncio o lo que estés organizando..."
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-emerald-500/40"
                  maxLength={500}
                />
                <p className="mt-1 text-right text-xs text-slate-500 dark:text-slate-400">
                  {newPostContent.length}/500
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  value={newPostLocation}
                  onChange={(event) => setNewPostLocation(event.target.value)}
                  placeholder="Ej: Buenos Aires, Argentina"
                  maxLength={120}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-900/70 dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Imagen o video (opcional)
                </label>
                <input
                  id="create-post-file-input"
                  type="file"
                  accept="image/*,video/*"
                  onChange={handlePostFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="create-post-file-input"
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-700 dark:text-slate-400 dark:hover:border-emerald-500 dark:hover:text-emerald-400 cursor-pointer"
                >
                  {newPostFile ? (
                    <>
                      <span className="font-medium text-slate-800 dark:text-white">{newPostFile.name}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Haz click para reemplazar el archivo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-xl">📎</span>
                      <span>Arrastra o haz click para subir</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Formatos permitidos: imágenes y videos</span>
                    </>
                  )}
                </label>
              </div>
              {newPostPreview && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Vista previa
                  </label>
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-950">
                    {newPostFile?.type.startsWith('image/') ? (
                      <img src={newPostPreview} alt="Vista previa" className="w-full object-cover" />
                    ) : (
                      <video
                        src={newPostPreview}
                        controls
                        className="w-full"
                      />
                    )}
                    <button
                      type="button"
                      onClick={removePostFile}
                      className="absolute top-3 right-3 rounded-full bg-black/60 px-2 py-1 text-xs text-white transition-colors hover:bg-black/80"
                    >
                      Quitar archivo
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700/50 dark:bg-slate-900/80">
              <button
                type="button"
                onClick={closeCreatePostModal}
                className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 disabled:opacity-70 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
                disabled={creatingPost}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={createPost}
                disabled={creatingPost}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creatingPost && <Loader2 className="h-4 w-4 animate-spin" />}
                {creatingPost ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Compartir */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[80vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700/50 dark:bg-transparent">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Compartir post</h3>
              <button
                onClick={() => {
                  setShowShareModal(false)
                  setSelectedPost(null)
                }}
                className="rounded-full p-2 text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            {/* Lista de Chats */}
            <div className="max-h-[60vh] overflow-y-auto px-5 py-5">
              {userChats.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400">No tienes chats disponibles</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userChats.map((chat) => (
                    <button
                      key={chat.id}
                      onClick={() => shareToChat(chat.id)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50 dark:border-slate-700/30 dark:bg-slate-800/50 dark:hover:border-blue-500/50 dark:hover:bg-slate-700/50"
                    >
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                        {chat.avatar ? (
                          <img 
                            src={chat.avatar} 
                            alt={chat.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-bold text-white">
                            {chat.name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white">
                          {chat.name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {chat.type === 'trip' ? 'Chat de viaje' : 'Chat privado'}
                        </p>
                      </div>
                      <Send className="h-5 w-5 text-emerald-500 dark:text-blue-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 dark:border-slate-700/50 dark:bg-transparent">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Crear historia</h3>
              <button 
                onClick={closeStoryModal}
                className="rounded-full p-2 text-slate-500 transition-colors hover:text-emerald-600 dark:text-slate-400 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            {/* Content */}
            <div className="max-h-[calc(90vh-200px)] overflow-y-auto px-5 py-5">
              {/* File Input */}
              <div className="mb-5">
                <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                  className="block w-full cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 transition-colors hover:border-emerald-400 hover:text-emerald-500 dark:border-slate-600 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
                >
                  <div>
                    {storyFile ? storyFile.name : 'Click para seleccionar archivo'}
                  </div>
                </label>
              </div>
              {/* Preview */}
              {storyPreview && (
                <div className="mb-5">
                  <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Vista previa
                  </label>
                  <div className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 aspect-video dark:border-slate-700 dark:bg-slate-950">
                    {storyFile?.type.startsWith('image/') ? (
                      <img 
                        src={storyPreview} 
                    alt="Preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <video 
                        src={storyPreview}
                        controls
                        className="h-full w-full object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
              {/* Text Content */}
              <div className="mb-5">
                <label className="mb-3 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Agrega un texto (opcional)
                </label>
                <textarea
                  value={storyContent}
                  onChange={(e) => setStoryContent(e.target.value)}
                  placeholder="Escribe algo sobre tu historia..."
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                  rows="3"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-3 border-t border-slate-200 bg-white px-5 py-4 dark:border-slate-700/50 dark:bg-slate-900/80">
              <button
                onClick={closeStoryModal}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={createStory}
                disabled={!storyFile || uploadingStory}
                className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:from-emerald-400 hover:to-cyan-400 disabled:cursor-not-allowed disabled:opacity-60 dark:from-blue-600 dark:to-purple-600 dark:hover:from-blue-500 dark:hover:to-purple-500"
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
          {hasPrevStory && (
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
                {currentGroupStories.map((_, idx) => {
                  const width =
                    idx < currentStoryIndex
                      ? '100%'
                      : idx === currentStoryIndex
                        ? `${Math.min(storyProgress * 100, 100)}%`
                        : '0%'
                  return (
                    <div
                      key={idx}
                      className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
                    >
                      <div
                        className="absolute inset-y-0 left-0 bg-white"
                        style={{ width }}
                      />
                    </div>
                  )
                })}
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
          {hasNextStory && (
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
          <div className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in fade-in zoom-in duration-200 dark:border-slate-700 dark:bg-slate-900">
            {/* Header */}
            <div className="border-b border-red-100 bg-gradient-to-r from-red-100/60 to-red-200/60 px-6 py-4 dark:border-red-500/30 dark:from-red-500/20 dark:to-red-600/20">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-500/20 p-2 dark:bg-red-500/30">
                  <Trash2 className="h-6 w-6 text-red-500 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-red-700 dark:text-white">Eliminar Post</h3>
              </div>
            </div>
            {/* Body */}
            <div className="px-6 py-6">
              <p className="text-base leading-relaxed text-slate-700 dark:text-slate-300">
                ¿Estás seguro de que quieres eliminar este post? Esta acción no se puede deshacer.
              </p>
            </div>
            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-700 dark:bg-slate-800/50">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setPostToDelete(null)
                }}
                className="rounded-lg bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={deletePost}
                className="flex items-center gap-2 rounded-lg bg-red-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
