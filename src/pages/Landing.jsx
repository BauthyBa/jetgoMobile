import Navigation from '@/components/Navigation'
import HeroSection from '@/components/HeroSection'
import Benefits from '@/components/Benefits'
import HowItWorks from '@/components/HowItWorks'
import Testimonials from '@/components/Testimonials'
import CTA from '@/components/CTA'

export default function Landing() {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white">
      <Navigation />
      <HeroSection />
      <HowItWorks />
      <Benefits />
      <Testimonials />
      <CTA />
    </div>
  )
}


