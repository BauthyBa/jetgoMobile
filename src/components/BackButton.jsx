import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

export default function BackButton({ fallback = '/' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = useCallback(() => {
    // Try to go back; if we are at an entry point (no meaningful history), redirect to fallback
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(fallback)
    }
  }, [navigate, fallback])

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Volver"
      className="fixed left-4 top-4 z-40 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Volver
    </button>
  )
}


