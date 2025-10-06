import { useState } from 'react'
import StarRating from './StarRating'
import GlassCard from './GlassCard'
import { createReview } from '@/services/api'
import { supabase } from '@/services/supabase'

export default function ReviewForm({ reviewedUserId, onReviewSubmitted, onCancel }) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Por favor selecciona una calificación')
      return
    }

    try {
      setLoading(true)
      setError('')

      // Obtener el usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Debes iniciar sesión para dejar una reseña')
        return
      }

      const reviewData = {
        reviewer_id: user.id,
        reviewed_user_id: reviewedUserId,
        rating: rating,
        comment: comment.trim()
      }

      const response = await createReview(reviewData)
      
      if (response.ok) {
        // Limpiar formulario
        setRating(0)
        setComment('')
        
        // Notificar al componente padre
        if (onReviewSubmitted) {
          onReviewSubmitted(response.review)
        }
      } else {
        setError(response.error || 'Error al enviar la reseña')
      }
    } catch (err) {
      setError(err.message || 'Error al enviar la reseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <GlassCard>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Dejar una reseña</h3>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          )}
        </div>

        {/* Calificación con estrellas */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Calificación *
          </label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            interactive={true}
            size={24}
            showNumber={false}
          />
          {rating > 0 && (
            <p className="text-xs text-gray-400 mt-1">
              {rating} de 5 estrellas
            </p>
          )}
        </div>

        {/* Comentario */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Comentario (opcional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comparte tu experiencia con este usuario..."
            rows={4}
            className="w-full bg-slate-700 border border-slate-600 text-white placeholder-slate-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-vertical"
            maxLength={500}
          />
          <p className="text-xs text-gray-400 mt-1">
            {comment.length}/500 caracteres
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md p-2">
            {error}
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="btn secondary flex-1"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="btn flex-1"
          >
            {loading ? 'Enviando...' : 'Enviar reseña'}
          </button>
        </div>
      </form>
    </GlassCard>
  )
}
