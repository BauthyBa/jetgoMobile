import StarRating from './StarRating'
import GlassCard from './GlassCard'
import { useState, useEffect } from 'react'
import { supabase } from '@/services/supabase'

export default function ReviewCard({ review, onEditClick }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [canEdit, setCanEdit] = useState(false)

  useEffect(() => {
    async function getCurrentUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setCurrentUser(user)
        setCanEdit(user && user.id === review.reviewer)
      } catch (err) {
        console.error('Error getting current user:', err)
      }
    }
    getCurrentUser()
  }, [review.reviewer])
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch {
      return 'Fecha no disponible'
    }
  }

  const getInitials = (name) => {
    if (!name) return '?'
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().slice(0, 2)
  }

  return (
    <GlassCard>
      <div className="flex gap-3">
        {/* Avatar del reviewer */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ 
            background: 'rgba(59,130,246,0.2)', 
            border: '1px solid rgba(59,130,246,0.3)',
            color: '#3b82f6'
          }}
        >
          {getInitials(review.reviewer_name)}
        </div>

        {/* Contenido de la reseña */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="font-semibold text-white text-sm">
                {review.reviewer_name || 'Usuario anónimo'}
              </h4>
              <p className="text-xs text-gray-400">
                {formatDate(review.created_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StarRating 
                rating={review.rating} 
                size={16} 
                interactive={false}
                showNumber={false}
              />
              {canEdit && onEditClick && (
                <button
                  onClick={() => onEditClick(review)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  title="Editar reseña"
                >
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* Comentario */}
          {review.comment && (
            <p className="text-sm text-gray-300 leading-relaxed">
              {review.comment}
            </p>
          )}
        </div>
      </div>
    </GlassCard>
  )
}
