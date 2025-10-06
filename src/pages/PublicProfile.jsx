import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import GlassCard from '@/components/GlassCard'
import ProfileCard from '@/components/ProfileCard'
import ReviewsSection from '@/components/ReviewsSection'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/services/supabase'

export default function PublicProfile() {
  const { userId } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userRow, setUserRow] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [isOwnProfile, setIsOwnProfile] = useState(false)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        // Obtener usuario actual
        const { data: { user } } = await supabase.auth.getUser()
        if (mounted) {
          setCurrentUser(user)
          setIsOwnProfile(user?.id === userId)
        }

        // Cargar datos públicos básicos desde la tabla User (nombre, apellido, etc.)
        const { data, error } = await supabase
          .from('User')
          .select('userid,nombre,apellido,sexo,fecha_nacimiento,mail,bio,interests,favorite_travel_styles')
          .eq('userid', userId)
          .limit(1)
        if (error) throw error
        const base = (data || [])[0] || null

        // Intentar leer metadata pública desde el auth (si RLS y settings lo permiten)
        let meta = {}
        try {
          const { data: authData } = await supabase.auth.admin.getUserById(userId)
          meta = authData?.user?.user_metadata || {}
        } catch (_e) {
          // Si no hay permisos admin en cliente, ignoramos metadata y usamos solo la tabla pública
          meta = {}
        }
        if (mounted) setUserRow({ base, meta })
      } catch (e) {
        if (mounted) setError(e?.message || 'No se pudo cargar el perfil')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    if (userId) load()
    return () => { mounted = false }
  }, [userId])

  if (loading) return <div className="container"><p className="muted">Cargando…</p></div>
  if (error) return <div className="container"><pre className="error">{error}</pre></div>
  const base = userRow?.base || {}
  const meta = userRow?.meta || {}
  const fullName = [base?.nombre, base?.apellido].filter(Boolean).join(' ') || meta?.first_name || ''
  // Leer bio/intereses desde tabla pública si existen
  const bioPublic = (base?.bio || '').toString()
  const parseListValue = (value) => {
    try {
      if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean)
      const raw = (value || '').toString().trim()
      if (!raw) return []
      try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed.map((v) => String(v).trim()).filter(Boolean)
      } catch {}
      const cleaned = raw.replace(/[\[\]{}\"]/g, ' ')
      return cleaned.split(/[\s,;]+/).map((t) => t.trim()).filter(Boolean)
    } catch {
      return []
    }
  }
  const interestsPublic = parseListValue(base?.interests)
  const favsPublic = parseListValue(base?.favorite_travel_styles)
  const initials = (fullName || base?.mail || 'U').charAt(0).toUpperCase()
  const bio = (meta?.bio || '').toString()
  const interests = Array.isArray(meta?.interests) ? meta.interests : ((meta?.interests || '').toString().split(',').map((t) => t.trim()).filter(Boolean))
  const favs = Array.isArray(meta?.favorite_travel_styles) ? meta.favorite_travel_styles : ((meta?.favorite_travel_styles || '').toString().split(',').map((t) => t.trim()).filter(Boolean))

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 text-white" style={{ display: 'grid', gap: 16 }}>
        <div className="glass-card" style={{ padding: 16 }}>
          <h3 className="page-title" style={{ margin: 0, color: '#60a5fa' }}>
            {isOwnProfile ? 'Mi Perfil' : 'Perfil'}
          </h3>
        </div>
        <ProfileCard profile={{
          user_id: userId,
          email: base?.mail,
          dni_verified: true,
          meta: {
            first_name: fullName,
            last_name: '',
            bio: bioPublic || bio,
            interests: (interestsPublic.length > 0 ? interestsPublic : interests),
            favorite_travel_styles: (favsPublic.length > 0 ? favsPublic : favs),
          },
        }} readOnly={!isOwnProfile} />
        
        {/* Sección de reseñas */}
        <ReviewsSection 
          userId={userId} 
          isOwnProfile={isOwnProfile}
        />
      </div>
    </DashboardLayout>
  )
}


