import { useNavigate } from 'react-router-dom'

export default function BackButton({ fallback = '/' }) {
  const navigate = useNavigate()
  function goBack() {
    try { navigate(fallback) } catch { navigate('/') }
  }
  return (
    <button
      type="button"
      onClick={goBack}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-600/60 bg-slate-800/60 text-slate-200 hover:bg-slate-700/60 hover:border-slate-500 transition-colors shadow-sm"
      aria-label="Volver"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      <span>Volver</span>
    </button>
  )
}

