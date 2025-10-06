import { useState } from 'react'

export default function StarRating({ 
  rating = 0, 
  onRatingChange = null, 
  size = 20, 
  interactive = false,
  showNumber = true 
}) {
  const [hoverRating, setHoverRating] = useState(0)
  
  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      onRatingChange(value)
    }
  }

  const handleMouseEnter = (value) => {
    if (interactive) {
      setHoverRating(value)
    }
  }

  const handleMouseLeave = () => {
    if (interactive) {
      setHoverRating(0)
    }
  }

  const displayRating = hoverRating || rating

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={!interactive}
            style={{ background: 'none', border: 'none', padding: '2px' }}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={star <= displayRating ? '#fbbf24' : 'none'}
              stroke={star <= displayRating ? '#fbbf24' : '#64748b'}
              strokeWidth="2"
              className="transition-colors"
            >
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </button>
        ))}
      </div>
      {showNumber && (
        <span className="text-sm text-gray-400 ml-1">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  )
}
