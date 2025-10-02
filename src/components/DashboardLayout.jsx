import { Link, useLocation } from 'react-router-dom'
import GlassCard from './GlassCard'

export default function DashboardLayout({ children }) {
  const location = useLocation()
  const nav = [
    { label: 'Inicio', path: '/dashboard#inicio', hash: '#inicio' },
    { label: 'Perfil', path: '/dashboard#profile', hash: '#profile' },
    { label: 'Chats', path: '/dashboard#chats', hash: '#chats' },
    { label: 'Viajes', path: '/dashboard#trips', hash: '#trips' },
    { label: 'Gastos', path: '/dashboard#expenses', hash: '#expenses' },
  ]
  const isActive = (item) => {
    const currentHash = location.hash || '#inicio'
    return currentHash === (item.hash || '')
  }
  return (
    <div className="min-h-screen" style={{ display: 'flex' }}>
      <aside className="glass-aside" style={{ width: 240, padding: 16 }}>
        <GlassCard>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', color: 'transparent' }}>JetGo</h1>
              <p className="muted" style={{ fontSize: 12 }}>Viaja, comparte, ahorra</p>
            </div>
            <nav style={{ display: 'grid', gap: 8 }}>
              {nav.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  className="btn secondary"
                  style={{
                    justifyContent: 'flex-start',
                    borderColor: isActive(n) ? 'rgba(59,130,246,0.55)' : undefined,
                    boxShadow: isActive(n) ? '0 8px 24px rgba(0, 164, 224, 0.35), inset 0 0 0 1px rgba(255,255,255,0.06)' : undefined,
                    background: isActive(n) ? 'linear-gradient(135deg, rgba(59,130,246,0.20), rgba(34,197,94,0.18))' : undefined,
                  }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="muted" style={{ fontSize: 12 }}>Versión 1.0.0</div>
          </div>
        </GlassCard>
      </aside>
      <main style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>{children}</main>
    </div>
  )
}


