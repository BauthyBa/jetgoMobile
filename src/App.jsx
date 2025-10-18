import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession, supabase } from '@/services/supabase'

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const redirect = (session) => {
      if (!mounted) return
      if (session?.user) {
        navigate('/social', { replace: true })
      } else {
        navigate('/login', { replace: true })
      }
    }

    async function bootstrap() {
      try {
        const session = await getSession()
        redirect(session)
      } catch (_error) {
        redirect(null)
      }
    }

    bootstrap()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      redirect(session)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero text-white">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-emerald-400" aria-label="Cargando" />
    </div>
  )
}
