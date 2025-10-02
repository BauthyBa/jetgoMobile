import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <img src="/jetgo.svg" alt="JetGo" width="24" height="24" />
            <Link to="/" className="text-2xl font-extrabold text-foreground/95">JetGo</Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <a href="#como-funciona" className="text-foreground hover:text-primary transition-colors">Cómo funciona</a>
            <a href="#beneficios" className="text-foreground hover:text-primary transition-colors">Beneficios</a>
            <a href="#testimonios" className="text-foreground hover:text-primary transition-colors">Testimonios</a>
          </div>
          <div className="flex items-center space-x-4">
            {loggedIn ? (
              <Link to="/dashboard"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Ir al dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
                <Link to="/signup"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Registrarse</Button></Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}


