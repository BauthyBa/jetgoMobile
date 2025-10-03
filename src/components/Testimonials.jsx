import { Star } from 'lucide-react'
import ColorBar from '@/components/ColorBar'

export default function Testimonials() {
  const testimonials = [
    { name: 'María González', role: 'Estudiante', text: 'He conocido personas increíbles y ahorro cada semana.', rating: 5, avatar: '/maria.png' },
    { name: 'Carlos Rodríguez', role: 'Ventas', text: 'Como conductor, comparto gastos y ayudo a otros.', rating: 5, avatar: '/carlos.png' },
    { name: 'Ana Martínez', role: 'Freelancer', text: 'Ahorro y viajo más. Totalmente recomendable.', rating: 5, avatar: '/ana.png', avatarPosition: 'top' },
  ]
  return (
    <section id="testimonios" className="py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Lo que dicen nuestros usuarios</h2>
          <div className="flex justify-center mb-6"><ColorBar className="w-52 rounded-full" /></div>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">Miles ya confían en JetGo</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="flex items-center mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-slate-300 mb-6 leading-relaxed italic">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <img
                  src={t.avatar || '/jetgo.png'}
                  alt={t.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-700/60"
                  style={{ objectPosition: t.avatarPosition || 'center' }}
                  width="40"
                  height="40"
                  loading="lazy"
                />
                <div>
                  <h4 className="font-semibold text-white">{t.name}</h4>
                  <p className="text-sm text-slate-400">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


