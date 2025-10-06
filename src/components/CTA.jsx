import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { getSession, supabase } from '@/services/supabase'
import { ArrowRight, Smartphone } from 'lucide-react'
import ColorBar from '@/components/ColorBar'

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
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl p-8 md:p-16 border border-slate-700/50 shadow-2xl">
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-4">¿Listo para tu próximo viaje?</h2>
          <div className="flex justify-center mb-6"><ColorBar className="w-48 rounded-full" /></div>
          <p className="text-xl text-white/90 mb-12 max-w-2xl mx-auto">Únete a miles viajando inteligente, económico y sostenible</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            {loggedIn ? (
              <Link to="/dashboard">
                <Button size="lg" className="bg-gradient-to-r from-blue-400 to-white hover:from-blue-300 hover:to-white text-slate-900 border border-blue-200 px-8 py-4 text-lg dark:from-blue-600 dark:to-blue-500 dark:hover:from-blue-500 dark:hover:to-blue-400 dark:text-white dark:border-transparent">
                  Ir al dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="lg" className="bg-gradient-to-r from-blue-400 to-white hover:from-blue-300 hover:to-white text-slate-900 border border-blue-200 px-8 py-4 text-lg dark:from-blue-600 dark:to-blue-500 dark:hover:from-blue-500 dark:hover:to-blue-400 dark:text-white dark:border-transparent">
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
            <Button size="lg" variant="outline" className="border-blue-200 text-slate-900 bg-white/80 hover:bg-white px-8 py-4 text-lg dark:border-slate-600 dark:text-white dark:bg-transparent dark:hover:bg-slate-700">
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


