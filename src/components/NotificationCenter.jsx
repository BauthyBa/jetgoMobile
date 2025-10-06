import { useState, useEffect } from 'react'
import GlassCard from './GlassCard'
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/api'
import { supabase } from '@/services/supabase'

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  // Cargar usuario actual
  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
      } catch (err) {
        console.error('Error getting current user:', err)
      }
    }
    getCurrentUser()
  }, [])

  // Cargar notificaciones
  const loadNotifications = async () => {
    if (!currentUser) return

    try {
      setLoading(true)
      setError('')
      
      const response = await getUserNotifications(currentUser.id)
      
      if (response.ok) {
        setNotifications(response.notifications || [])
        setUnreadCount(response.unread_count || 0)
      } else {
        setError(response.error || 'Error al cargar notificaciones')
      }
    } catch (err) {
      setError(err.message || 'Error al cargar notificaciones')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (currentUser) {
      loadNotifications()
    }
  }, [currentUser])

  // Marcar notificación como leída
  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await markNotificationRead(notificationId, currentUser.id)
      if (response.ok) {
        // Actualizar estado local
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true }
              : notif
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error('Error marking notification as read:', err)
    }
  }

  // Marcar todas como leídas
  const handleMarkAllAsRead = async () => {
    try {
      const response = await markAllNotificationsRead(currentUser.id)
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        )
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err)
    }
  }

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (now - date) / (1000 * 60 * 60)
      
      if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now - date) / (1000 * 60))
        return `Hace ${diffInMinutes} min`
      } else if (diffInHours < 24) {
        return `Hace ${Math.floor(diffInHours)} h`
      } else {
        const diffInDays = Math.floor(diffInHours / 24)
        return `Hace ${diffInDays} día${diffInDays !== 1 ? 's' : ''}`
      }
    } catch {
      return 'Fecha no disponible'
    }
  }

  const formatFullDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Fecha no disponible'
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_review':
        return '⭐'
      case 'trip_join':
        return '✈️'
      case 'trip_update':
        return '📝'
      case 'message':
        return '💬'
      default:
        return '🔔'
    }
  }

  if (!currentUser) {
    return null
  }

  return (
    <div className="w-80">
      {/* Container de Notificaciones */}
      <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-600/50 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500/20 rounded-md flex items-center justify-center text-sm">
              🔔
            </div>
            <h3 className="text-sm font-semibold text-white">
              Notificaciones
            </h3>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px]">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
            >
              Leer todas
            </button>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-4">
            <p className="text-gray-400">Cargando notificaciones...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm mb-4">
            {error}
          </div>
        )}

        {/* Lista de notificaciones */}
        {!loading && notifications.length > 0 && (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.slice(0, 3).map((notification) => (
              <div
                key={notification.id}
                className={`p-2 rounded-md border cursor-pointer transition-all duration-200 hover:bg-opacity-80 ${
                  notification.read 
                    ? 'bg-gray-800/20 border-gray-700/30' 
                    : 'bg-blue-900/15 border-blue-600/30'
                }`}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center text-sm ${
                    notification.read ? 'bg-gray-700/30' : 'bg-blue-500/15'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <h4 className={`text-xs font-medium leading-tight ${
                        notification.read ? 'text-gray-300' : 'text-white'
                      }`}>
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                      )}
                    </div>
                    <p className={`text-[10px] mt-0.5 leading-relaxed ${
                      notification.read ? 'text-gray-400' : 'text-gray-300'
                    }`}>
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[9px] text-gray-500">
                        {formatDate(notification.created_at)}
                      </p>
                      <p className="text-[9px] text-gray-500 font-mono">
                        {formatFullDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {notifications.length > 3 && (
              <div className="text-center py-1">
                <p className="text-[10px] text-gray-400">
                  +{notifications.length - 3} más
                </p>
              </div>
            )}
          </div>
        )}

        {/* Estado vacío */}
        {!loading && notifications.length === 0 && (
          <div className="text-center py-4">
            <div className="w-8 h-8 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-sm">🔔</span>
            </div>
            <p className="text-gray-400 text-xs">No tienes notificaciones</p>
            <p className="text-gray-500 text-[10px] mt-0.5">Las nuevas aparecerán aquí</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-2 pt-2 border-t border-gray-600/30 flex justify-center">
          <button
            onClick={loadNotifications}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-blue-500/10"
          >
            🔄 Actualizar
          </button>
        </div>
      </div>
    </div>
  )
}
