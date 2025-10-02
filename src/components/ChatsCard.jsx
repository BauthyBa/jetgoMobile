import GlassCard from './GlassCard'

export default function ChatsCard({ rooms = [] }) {
  const count = rooms.length
  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Chats de Viajes</h2>
        <span className="muted" style={{ fontSize: 12 }}>{count} activos</span>
      </div>
      <div style={{ display: 'grid', gap: 8, maxHeight: 360, overflow: 'auto' }}>
        {rooms.map((r) => (
          <div key={r.id} className="card" style={{ padding: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
              </div>
              <a href="#chats" className="btn secondary" style={{ height: 32 }}>Abrir</a>
            </div>
          </div>
        ))}
        {rooms.length === 0 && <p className="muted">No hay chats activos.</p>}
      </div>
    </GlassCard>
  )
}


