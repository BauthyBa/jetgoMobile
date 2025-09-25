import { Link, Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '../services/supabase'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'
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
      {!isHome && (
        <header className="header">
          <div className="header-inner">
            <Link to="/" className="brand">JetGo</Link>
            {!loggedIn && (
              <nav className="nav">
                <Link to="/register">Registro</Link>
                <Link to="/login">Login</Link>
              </nav>
            )}
          </div>
        </header>
      )}
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}


