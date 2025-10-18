export default function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-hero text-foreground" style={{ display: 'flex', flexDirection: 'column' }}>
      <main style={{ flex: 1, overflow: 'auto', scrollBehavior: 'smooth' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">
          {children}
        </div>
      </main>
    </div>
  )
}


