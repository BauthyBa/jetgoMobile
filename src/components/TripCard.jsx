export default function TripCard({ trip, onJoin, onLeave, joining, leaving, onEdit, canEdit, isMember, isOwner }) {
  if (!trip) return null
  const dateRange = trip.startDate
    ? (trip.endDate ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}` : new Date(trip.startDate).toLocaleDateString())
    : null
  const budget = trip.budgetMin || trip.budgetMax
    ? `$${trip.budgetMin ?? '?'} - $${trip.budgetMax ?? '?'}`
    : null
  const occupancy = (trip.currentParticipants != null || trip.maxParticipants != null)
    ? `${trip.currentParticipants ?? '?'} / ${trip.maxParticipants ?? '?'}`
    : null

  return (
    <div className="card glass-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, width: 260, height: 260 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {trip.imageUrl && (
          <img src={trip.imageUrl} alt={trip.name} style={{ width: 72, height: 72, borderRadius: 12, objectFit: 'cover' }} />
        )}
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontWeight: 600 }}>
            {trip.name}
          </div>
          <div className="muted">
            {(trip.origin || 'Origen ?')} → {(trip.destination || 'Destino ?')}
          </div>
          {dateRange && <div className="muted">{dateRange}</div>}
          {trip.country && <div className="muted">{trip.country}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        {budget && <span className="muted">Presupuesto: {budget}</span>}
        {trip.roomType && <span className="muted">Habitación: {trip.roomType}</span>}
        {trip.season && <span className="muted">Temporada: {trip.season}</span>}
        {occupancy && <span className="muted">Cupos: {occupancy}</span>}
      </div>
      {trip.tags && trip.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {trip.tags.map((t) => (
            <span key={t} className="muted" style={{ border: '1px solid rgba(155, 235, 255, 0.25)', padding: '2px 8px', borderRadius: 999 }}>{t}</span>
          ))}
        </div>
      )}
      <div className="actions" style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
        {canEdit && (
          <button className="btn secondary" type="button" onClick={onEdit}>Editar</button>
        )}
        <div style={{ flex: 1 }} />
        {isMember ? (
          <button className="btn secondary" type="button" disabled={leaving} onClick={onLeave}>
            {isOwner ? (leaving ? 'Eliminando…' : 'Eliminar viaje') : (leaving ? 'Saliendo…' : 'Abandonar')}
          </button>
        ) : (
          <button className="btn" type="button" disabled={joining} onClick={onJoin}>{joining ? 'Uniendo…' : 'Unirme'}</button>
        )}
      </div>
    </div>
  )
}


