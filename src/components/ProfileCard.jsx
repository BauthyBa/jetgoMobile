import GlassCard from './GlassCard'

export default function ProfileCard({ profile }) {
  const name = profile?.meta?.first_name || profile?.email || ''
  const email = profile?.email || ''
  const location = profile?.meta?.country || ''
  return (
    <GlassCard hover>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ width: 80, height: 80, borderRadius: 999, background: 'rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>
          {name ? (
            <span style={{ fontSize: 28, color: '#3b82f6', fontWeight: 700 }}>{name?.charAt(0)?.toUpperCase()}</span>
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          {name && <h2 style={{ fontSize: 20, fontWeight: 700 }}>{name}</h2>}
          {email && <p className="muted" style={{ fontSize: 14 }}>{email}</p>}
          {location && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>{location}</p>}
        </div>
      </div>
    </GlassCard>
  )
}


