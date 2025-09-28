import { Link, Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '../services/supabase'

export default function Layout() {
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
    <div>
      <header className="header">
        <div className="header-inner">
          <nav className="nav">
            <Link to="/#viajes">Viajes</Link>
            <Link to="/#herramientas">Herramientas</Link>
            <Link to="/#sobre-nosotros">Sobre nosotros</Link>
            <Link to="/#soporte">Soporte</Link>
            {!loggedIn && (
              <>
                <Link to="/login">Iniciar sesión</Link>
                <Link to="/signup">Registrarse</Link>
              </>
            )}
          </nav>
          <Link to="/" className="brand" aria-label="JetGo">
            <img src="/jetgo.svg" alt="" width="20" height="20" style={{ verticalAlign: 'middle', marginRight: 8 }} />
            JetGo
          </Link>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}


