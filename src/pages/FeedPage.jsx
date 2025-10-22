import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSession } from '@/services/supabase'
import SocialFeed from '@/components/SocialFeed'
import { Activity } from 'lucide-react'

export default function FeedPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const session = await getSession()
      if (session?.user) {
        setUser(session.user)
      } else {
        navigate('/login')
      }
    } catch (error) {
      console.error('Error cargando usuario:', error)
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-hero dark:bg-slate-950">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-white">Cargando...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-hero dark:bg-slate-950">
      <div className="container mx-auto px-4 py-8 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Feed Social</h1>
            <p className="text-white/70">Mantente al día con la actividad de JetGo</p>
          </div>
        </div>

        {/* Feed Component */}
        <SocialFeed />
      </div>
    </div>
  )
}
