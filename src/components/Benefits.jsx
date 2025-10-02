import { DollarSign, Users, Leaf, Shield, Clock, Heart } from 'lucide-react'
import ColorBar from '@/components/ColorBar'

export default function Benefits() {
  const benefits = [
    { icon: DollarSign, title: 'Ahorra dinero', description: 'Reduce hasta un 75% los costos compartiendo gastos' },
    { icon: Leaf, title: 'Cuida el planeta', description: 'Reduce tu huella de carbono compartiendo vehículos' },
    { icon: Users, title: 'Conoce personas', description: 'Conecta con personas interesantes en tu ruta' },
    { icon: Shield, title: 'Viaja seguro', description: 'Conductores verificados y soporte 24/7' },
    { icon: Clock, title: 'Flexible y conveniente', description: 'Encuentra viajes a cualquier hora del día' },
    { icon: Heart, title: 'Comunidad amigable', description: 'Únete a una comunidad de viajeros' },
  ]
  return (
    <section id="beneficios" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">¿Por qué elegir <span className="bg-gradient-primary bg-clip-text text-transparent">JetGo</span>?</h2>
          <div className="flex justify-center mb-6"><ColorBar className="w-48 rounded-full" /></div>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto">Más que una plataforma, una comunidad</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((b, i) => {
            const Icon = b.icon
            return (
              <div key={i} className="group bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl hover:-translate-y-1 transition-all">
                <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform bg-gradient-to-r from-blue-600 to-blue-500">
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">{b.title}</h3>
                <p className="text-slate-300 leading-relaxed">{b.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}


