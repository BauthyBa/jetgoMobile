import { Star } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    { name: 'María González', role: 'Estudiante', text: 'He conocido personas increíbles y ahorro cada semana.', rating: 5 },
    { name: 'Carlos Rodríguez', role: 'Ventas', text: 'Como conductor, comparto gastos y ayudo a otros.', rating: 5 },
    { name: 'Ana Martínez', role: 'Freelancer', text: 'Ahorro y viajo más. Totalmente recomendable.', rating: 5 },
  ]
  return (
    <section id="testimonios" className="py-20 bg-gradient-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Lo que dicen nuestros usuarios</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Miles ya confían en JetGo</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl p-8 shadow-soft hover:shadow-medium transition-all duration-300">
              <div className="flex items-center mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-6 leading-relaxed italic">"{t.text}"</p>
              <div>
                <h4 className="font-semibold text-foreground">{t.name}</h4>
                <p className="text-sm text-muted-foreground">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}


