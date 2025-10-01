import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function Navigation() {
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
            <Link to="/login"><Button variant="ghost">Iniciar sesión</Button></Link>
            <Link to="/signup"><Button className="bg-primary text-primary-foreground hover:bg-primary/90">Registrarse</Button></Link>
          </div>
        </div>
      </div>
    </nav>
  )
}


