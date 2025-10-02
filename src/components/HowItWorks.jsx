import searchIcon from '@/assets/search-icon.jpg'
import connectIcon from '@/assets/connect-icon.jpg'
import saveIcon from '@/assets/save-icon.jpg'
import ColorBar from '@/components/ColorBar'

export default function HowItWorks() {
  const steps = [
    { icon: searchIcon, title: 'Busca tu viaje', description: 'Introduce origen, destino y fecha' },
    { icon: connectIcon, title: 'Conecta con conductores', description: 'Perfiles, reseñas y contacto directo' },
    { icon: saveIcon, title: 'Viaja y ahorra', description: 'Ahorra y cuida el medio ambiente' },
  ]
  return (
    <section id="como-funciona" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">¿Cómo funciona?</h2>
          <div className="flex justify-center mb-6"><ColorBar className="w-40 rounded-full" /></div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Viajar compartido en 3 pasos</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((s, i) => (
            <div key={i} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-slate-700/50 shadow-2xl hover:-translate-y-1 transition-all">
              <div className="relative mb-8">
                <div className="w-24 h-24 mx-auto mb-4 rounded-full p-1 bg-gradient-to-r from-blue-600 to-blue-500">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                    <img src={s.icon} alt={s.title} className="w-12 h-12 object-contain" />
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">{i + 1}</div>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">{s.title}</h3>
              <p className="text-slate-300 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


