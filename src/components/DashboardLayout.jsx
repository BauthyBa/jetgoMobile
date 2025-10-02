import { Link } from 'react-router-dom'
import GlassCard from './GlassCard'

export default function DashboardLayout({ children }) {
  const nav = [
    { label: 'Inicio', path: '/dashboard' },
    { label: 'Perfil', path: '/dashboard#profile' },
    { label: 'Chats', path: '/dashboard#chats' },
    { label: 'Viajes', path: '/dashboard#trips' },
    { label: 'Gastos', path: '/dashboard#expenses' },
  ]
  return (
    <div className="min-h-screen" style={{ display: 'flex' }}>
      <aside style={{ width: 240, padding: 16 }}>
        <GlassCard>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 700, background: 'linear-gradient(135deg, #3b82f6, #22c55e)', WebkitBackgroundClip: 'text', color: 'transparent' }}>JetGo</h1>
              <p className="muted" style={{ fontSize: 12 }}>Viaja, comparte, ahorra</p>
            </div>
            <nav style={{ display: 'grid', gap: 8 }}>
              {nav.map((n) => (
                <Link key={n.path} to={n.path} className="btn secondary" style={{ justifyContent: 'flex-start' }}>{n.label}</Link>
              ))}
            </nav>
            <div className="muted" style={{ fontSize: 12 }}>Versión 1.0.0</div>
          </div>
        </GlassCard>
      </aside>
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}


