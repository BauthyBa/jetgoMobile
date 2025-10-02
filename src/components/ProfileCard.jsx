import GlassCard from './GlassCard'

export default function ProfileCard({ profile }) {
  const name = profile?.meta?.first_name || profile?.email || ''
  const email = profile?.email || ''
  const location = profile?.meta?.country || ''
  const userId = typeof profile?.user_id === 'string' ? profile.user_id : ''
  const dni = profile?.meta?.document_number || profile?.meta?.dni || ''
  const dniVerified = profile?.dni_verified === true
  const lastName = profile?.meta?.last_name || profile?.meta?.surname || ''
  const birthDateRaw = profile?.meta?.birth_date || profile?.meta?.date_of_birth || profile?.meta?.dob || profile?.meta?.birthday || ''
  const birthDate = (() => {
    if (!birthDateRaw) return ''
    const d = new Date(birthDateRaw)
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  })()
  const age = (() => {
    if (!birthDate) return ''
    try {
      const [y, m, d] = birthDate.split('-').map((v) => parseInt(v))
      const today = new Date()
      let a = today.getFullYear() - y
      const mDiff = today.getMonth() + 1 - m
      const dDiff = today.getDate() - d
      if (mDiff < 0 || (mDiff === 0 && dDiff < 0)) a -= 1
      return a >= 0 ? String(a) : ''
    } catch {
      return ''
    }
  })()
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

          {(userId || dni || lastName || birthDate || age) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.15)' }}>
              {userId && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Supabase User ID</div>
                  <div style={{ fontSize: 13, wordBreak: 'break-all' }}>{userId}</div>
                </div>
              )}
              {dni && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>DNI</div>
                  <div style={{ fontSize: 13 }}>{dni}</div>
                </div>
              )}
              {lastName && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Apellido</div>
                  <div style={{ fontSize: 13 }}>{lastName}</div>
                </div>
              )}
              {birthDate && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Fecha de nacimiento</div>
                  <div style={{ fontSize: 13 }}>{birthDate}</div>
                </div>
              )}
              {age && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>Edad</div>
                  <div style={{ fontSize: 13 }}>{age} años</div>
                </div>
              )}
              {typeof dniVerified === 'boolean' && (
                <div>
                  <div className="muted" style={{ fontSize: 12 }}>DNI Verificado</div>
                  <div style={{ fontSize: 13, color: dniVerified ? '#22c55e' : '#ef4444' }}>{dniVerified ? 'Sí' : 'No'}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  )
}


