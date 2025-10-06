import { useState, useEffect } from 'react'
import StarRating from './StarRating'
import ReviewCard from './ReviewCard'
import ReviewForm from './ReviewForm'
import GlassCard from './GlassCard'
import { getUserReviews } from '@/services/api'
import { supabase } from '@/services/supabase'

export default function ReviewsSection({ userId, isOwnProfile = false }) {
  const [reviews, setReviews] = useState([])
  const [statistics, setStatistics] = useState({
    total_reviews: 0,
    average_rating: 0,
    rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
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

  // Cargar reseñas
  const loadReviews = async () => {
    try {
      setLoading(true)
      setError('')
      
      const response = await getUserReviews(userId)
      
      if (response.ok) {
        setReviews(response.reviews || [])
        setStatistics(response.statistics || {
          total_reviews: 0,
          average_rating: 0,
          rating_distribution: { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
        })
      } else {
        setError(response.error || 'Error al cargar las reseñas')
      }
    } catch (err) {
      setError(err.message || 'Error al cargar las reseñas')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userId) {
      loadReviews()
    }
  }, [userId])

  const handleReviewSubmitted = (newReview) => {
    // Recargar las reseñas después de enviar una nueva
    loadReviews()
    setShowReviewForm(false)
  }

  const canLeaveReview = () => {
    // No puede dejar reseña si:
    // - Es su propio perfil
    // - No está logueado
    // - Ya dejó una reseña
    if (isOwnProfile || !currentUser) return false
    
    const hasReviewed = reviews.some(review => review.reviewer === currentUser.id)
    return !hasReviewed
  }

  const getRatingDistributionPercentages = () => {
    const total = statistics.total_reviews
    if (total === 0) return { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 }
    
    const percentages = {}
    for (let i = 1; i <= 5; i++) {
      percentages[i.toString()] = Math.round((statistics.rating_distribution[i.toString()] / total) * 100)
    }
    return percentages
  }

  if (loading) {
    return (
      <GlassCard>
        <div className="text-center py-8">
          <p className="text-gray-400">Cargando reseñas...</p>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-4">
      {/* Estadísticas de reseñas */}
      <GlassCard>
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Reseñas</h3>
          
          {statistics.total_reviews > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Promedio general */}
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-2">
                  {statistics.average_rating.toFixed(1)}
                </div>
                <StarRating 
                  rating={statistics.average_rating} 
                  size={20} 
                  interactive={false}
                  showNumber={false}
                />
                <p className="text-sm text-gray-400 mt-2">
                  Basado en {statistics.total_reviews} reseña{statistics.total_reviews !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Distribución de calificaciones */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = statistics.rating_distribution[rating.toString()] || 0
                  const percentage = getRatingDistributionPercentages()[rating.toString()]
                  
                  return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="text-gray-300 w-8">{rating}★</span>
                      <div className="flex-1 bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-yellow-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-gray-400 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-400">Este usuario aún no tiene reseñas</p>
            </div>
          )}

          {/* Botón para dejar reseña */}
          {canLeaveReview() && !showReviewForm && (
            <div className="pt-4 border-t border-gray-600">
              <button
                onClick={() => setShowReviewForm(true)}
                className="btn w-full"
              >
                ⭐ Dejar una reseña
              </button>
            </div>
          )}
        </div>
      </GlassCard>

      {/* Formulario de reseña */}
      {showReviewForm && (
        <ReviewForm
          reviewedUserId={userId}
          onReviewSubmitted={handleReviewSubmitted}
          onCancel={() => setShowReviewForm(false)}
        />
      )}

      {/* Lista de reseñas */}
      {reviews.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-white px-1">
            Todas las reseñas ({reviews.length})
          </h4>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <GlassCard>
          <div className="text-red-400 text-center py-4">
            {error}
          </div>
        </GlassCard>
      )}

      {/* Mensaje informativo para usuarios no logueados */}
      {!currentUser && !isOwnProfile && (
        <GlassCard>
          <div className="text-center py-4">
            <p className="text-gray-400">
              <a href="/login" className="text-blue-400 hover:text-blue-300">
                Inicia sesión
              </a> para dejar una reseña
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
