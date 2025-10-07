import { Link, useLocation } from 'react-router-dom'
import GlassCard from './GlassCard'
import ThemeToggle from '@/components/ThemeToggle'
import ColorBar from '@/components/ColorBar'

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
    <div className="min-h-screen bg-gradient-hero text-foreground" style={{ display: 'flex', flexDirection: 'column' }}>
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shadow-lg">
        <ColorBar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative">
                <img src="/jetgo.png?v=2" alt="JetGo" width="36" height="36" className="w-8 h-8 sm:w-9 sm:h-9" />
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm group-hover:bg-blue-500/30 transition-all"></div>
              </div>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent group-hover:from-blue-300 group-hover:to-emerald-300 transition-all">
                JetGo
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {nav.map((n) => (
                <Link
                  key={n.path}
                  to={n.path}
                  className={`relative px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                    isActive(n) 
                      ? 'text-white bg-blue-500/20 border border-blue-500/30 shadow-lg' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {n.label}
                  {isActive(n) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full"></div>
                  )}
                </Link>
              ))}
            </div>
            
            {/* Mobile Navigation */}
            <div className="lg:hidden flex items-center gap-3">
              <details className="relative group">
                <summary className="list-none cursor-pointer">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-all border border-slate-600/50">
                    <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span className="text-sm font-medium text-slate-300">Menú</span>
                  </div>
                </summary>
                <div className="absolute right-0 mt-2 w-48 bg-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-xl shadow-2xl overflow-hidden">
                  {nav.map((n) => (
                    <Link 
                      key={n.path} 
                      to={n.path} 
                      className={`block px-4 py-3 text-sm font-medium transition-all ${
                        isActive(n) 
                          ? 'text-blue-400 bg-blue-500/10 border-l-2 border-blue-400' 
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      {n.label}
                    </Link>
                  ))}
                </div>
              </details>
              
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <span className="text-xs text-slate-500 hidden sm:block">v1.0.0</span>
              </div>
            </div>
            
            {/* Desktop Right Side */}
            <div className="hidden lg:flex items-center gap-4">
              <ThemeToggle />
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/30 rounded-lg border border-slate-600/30">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-slate-400">v1.0.0</span>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-auto scroll-smooth">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  )
}


