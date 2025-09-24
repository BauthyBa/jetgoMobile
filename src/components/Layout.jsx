import { Link, Outlet } from 'react-router-dom'

export default function Layout() {
  return (
    <div>
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">JetGo</Link>
          <nav className="nav">
            <Link to="/register">Registro</Link>
            <Link to="/login">Login</Link>
          </nav>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  )
}


