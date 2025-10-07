import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import ColorBar from '@/components/ColorBar'
import ThemeToggle from '@/components/ThemeToggle'

export default function Navigation() {
  const [loggedIn, setLoggedIn] = useState(false)
  useEffect(() => {
    let mounted = true
    getSession().then((s) => { if (mounted) setLoggedIn(!!s?.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session?.user)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])
  return (
    <nav className="fixed top-0 w-full z-50 glass-nav">
      <ColorBar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 relative">
          <div className="flex items-center gap-2 flex-shrink-0">
            <img src="/jetgo.png?v=2" alt="JetGo" width="44" height="44" />
            <Link to="/" className="text-3xl font-extrabold text-white hover:text-emerald-400 transition-colors">JetGo</Link>
          </div>
          <div className="hidden md:flex items-center space-x-8 absolute left-1/2 -translate-x-1/2">
            <a href="#como-funciona" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Cómo funciona</a>
            <a href="#beneficios" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Beneficios</a>
            <a href="#testimonios" className="text-slate-200 hover:text-emerald-400 transition-colors font-medium">Testimonios</a>
          </div>
          <div className="flex items-center space-x-4 flex-shrink-0 ml-auto">
            <ThemeToggle />
            {loggedIn ? (
              <Link to="/dashboard"><Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white">Ir al dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
                <Link to="/signup"><Button className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white">Registrarse</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}


