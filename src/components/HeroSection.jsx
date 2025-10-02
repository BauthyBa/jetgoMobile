import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Calendar } from 'lucide-react'
import ColorBar from '@/components/ColorBar'

export default function HeroSection() {
  return (
    <section className="relative min-h-[88vh] flex items-center bg-gradient-to-b from-slate-900 to-slate-800 pt-24">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white w-full">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 leading-tight">Viaja más,<br /><span className="text-emerald-400">gasta menos</span></h1>
          <div className="flex justify-center mb-6"><ColorBar className="w-56 rounded-full" /></div>
          <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-white/90">Conecta con personas que van a tu mismo destino y comparte el viaje</p>
        </div>
        <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-6 md:p-8 max-w-5xl mx-auto mb-8 border border-slate-700/60 shadow-strong">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input placeholder="Desde" className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input placeholder="Hasta" className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-slate-300" />
                <Input type="date" className="pl-10 bg-slate-700/90 border-slate-500 text-white placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200" />
              </div>
            </div>
            <div className="md:col-span-1">
              <Button size="lg" className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-emerald-500 hover:brightness-110 text-white shadow-xl ring-1 ring-blue-400/40">
                <Search className="mr-2 h-5 w-5" />
                Buscar viajes
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="outline" className="border-slate-500 text-white bg-transparent hover:bg-slate-700 hover:text-white ring-1 ring-slate-400/20">Publicar un viaje</Button>
        </div>
      </div>
    </section>
  )
}


