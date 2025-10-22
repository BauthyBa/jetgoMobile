import { Outlet } from 'react-router-dom'
import Navigation from '@/components/Navigation'
import BackButtonHandler from '@/components/BackButtonHandler'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gradient-hero dark:bg-slate-950 transition-colors">
      <Navigation />
      <BackButtonHandler />
      <main>
        <Outlet />
      </main>
    </div>
  )
}
