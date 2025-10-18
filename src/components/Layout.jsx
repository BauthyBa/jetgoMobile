import { Outlet } from 'react-router-dom'
import Navigation from '@/components/Navigation'

export default function Layout() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <main className="pt-20">
        <Outlet />
      </main>
    </div>
  )
}
