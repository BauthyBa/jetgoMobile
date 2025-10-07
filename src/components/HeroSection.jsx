import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Calendar } from 'lucide-react'
import Reveal from '@/components/Reveal'
import ColorBar from '@/components/ColorBar'
import { searchLocations } from '@/services/tripadvisor'
import { getSession, supabase } from '@/services/supabase'

export default function HeroSection() {
  const [fromText, setFromText] = useState('')
  const [toText, setToText] = useState('')
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true
    getSession().then((s) => { if (mounted) setLoggedIn(!!s?.user) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setLoggedIn(!!session?.user)
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function handleSearch() {
    try {
      setLoading(true)
      setError('')
      setResults([])
      const found = await searchLocations(toText, { category: 'geos', language: 'es' })
      setResults(Array.isArray(found) ? found.slice(0, 6) : [])
    } catch (_e) {
      setError('No se pudieron buscar destinos ahora.')
    } finally {
      setLoading(false)
    }
  }

  function handleGoTrips() {
    if (loggedIn) {
      navigate('/dashboard#trips')
    } else {
      navigate('/login')
    }
  }

  return (
    <section className="relative min-h-[88vh] flex items-center bg-gradient-to-b from-slate-900 to-slate-800 pt-24 overflow-hidden">
      <div aria-hidden className="absolute inset-0 z-[1] pointer-events-none">
        <img src="/hero-landmarks.jpg" alt="" className="w-full h-full object-cover opacity-60 blur-[3px] scale-105" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/35 to-slate-900/75" />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white w-full">
        <div className="max-w-4xl mx-auto">
          <Reveal>
            <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">Viaja más,<br /><span className="text-emerald-400">gasta menos</span></h1>
          </Reveal>
          <Reveal delay={100}>
            <div className="flex justify-center mb-6"><ColorBar className="w-56 rounded-full" /></div>
          </Reveal>
          <Reveal delay={150}>
            <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-white/90">Conecta con personas que van a tu mismo destino y comparte el viaje</p>
          </Reveal>
        </div>
        <Reveal delay={200}>
        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-5xl mx-auto mb-8 border border-slate-700/60 shadow-strong">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  placeholder="Desde"
                  value={fromText}
                  onChange={(e) => setFromText(e.target.value)}
                  className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  placeholder="Hasta"
                  value={toText}
                  onChange={(e) => setToText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSearch()
                  }}
                  className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <Button
                size="lg"
                onClick={handleGoTrips}
                disabled={false}
                className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:brightness-110 text-white shadow-xl ring-1 ring-blue-400/40 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Search className="mr-2 h-5 w-5" />
                {loading ? 'Buscando…' : 'Buscar viajes'}
              </Button>
            </div>
          </div>
          {(error || loading || results.length > 0) && (
            <div className="mt-6 text-left">
              {error && <p className="text-red-300 text-sm mb-2">{error}</p>}
              {loading && !error && (
                <p className="text-slate-300 text-sm">Buscando destinos…</p>
              )}
              {!loading && !error && results.length > 0 && (
                <div className="bg-slate-800/70 border border-slate-700/60 rounded-xl divide-y divide-slate-700/60 overflow-hidden">
                  {results.map((r) => (
                    <button
                      key={r.location_id || r.id}
                      onClick={() => setToText(r.name || '')}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700/60 focus:outline-none"
                    >
                      <div className="font-medium">{r.name || 'Destino'}</div>
                      <div className="text-sm text-slate-300">
                        {(r.address_obj && r.address_obj.address_string) || r.location_string || ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        </Reveal>
        <Reveal delay={250}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="outline" onClick={handleGoTrips} className="border-slate-500 text-white bg-transparent hover:bg-slate-700 hover:text-white ring-1 ring-slate-400/20">Publicar un viaje</Button>
          </div>
        </Reveal>
      </div>
    </section>
  )
}


