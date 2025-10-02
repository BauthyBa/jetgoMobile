import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import { ArrowRight, Smartphone } from 'lucide-react'

export default function CTA() {
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
    <section className="py-20 bg-gradient-hero">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="glass-card rounded-3xl p-8 md:p-16">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">¿Listo para tu próximo viaje?</h2>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">Únete a miles viajando inteligente, económico y sostenible</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {loggedIn ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8 py-4 text-lg">
                  Ir al dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 px-8 py-4 text-lg">
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button size="lg" variant="outline" className="border-white text-black bg-white/90 hover:bg-white px-8 py-4 text-lg">
              <Smartphone className="mr-2 h-5 w-5" />
              Descargar app
            </Button>
          </div>
          <p className="text-white/70 text-sm">Registro gratuito • Sin tarifas ocultas • Soporte 24/7</p>
        </div>
      </div>
    </section>
  )
}


