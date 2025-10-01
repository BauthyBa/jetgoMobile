import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, MapPin, Calendar } from 'lucide-react'
import heroImage from '@/assets/hero-image.jpg'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={heroImage} alt="Hero" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-hero opacity-90"></div>
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
        <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">Viaja más,<br /><span className="text-secondary-glow">gasta menos</span></h1>
        <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto opacity-90">Conecta con personas que van a tu mismo destino y comparte el viaje</p>
        <div className="glass-card rounded-2xl p-6 md:p-8 max-w-4xl mx-auto mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input placeholder="Desde" className="pl-10 bg-white/20 border-white/20 text-white placeholder:text-white/70" />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input placeholder="Hasta" className="pl-10 bg-white/20 border-white/20 text-white placeholder:text-white/70" />
              </div>
            </div>
            <div className="md:col-span-1">
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <Input type="date" className="pl-10 bg-white/20 border-white/20 text-white" />
              </div>
            </div>
            <div className="md:col-span-1">
              <Button size="lg" className="w-full bg-secondary hover:bg-secondary/90 text-white">
                <Search className="mr-2 h-5 w-5" />
                Buscar viajes
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-foreground">Publicar un viaje</Button>
        </div>
      </div>
    </section>
  )
}


