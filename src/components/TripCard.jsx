import { Link } from 'react-router-dom'

export default function TripCard({ trip, onJoin, onLeave, joining, leaving, onEdit, canEdit, isMember, isOwner, onApply, hasApplied }) {
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

  const short = (str, max = 36) => {
    try { const s = String(str || '').trim(); return s.length > max ? s.slice(0, max - 1) + '…' : s } catch { return str }
  }

  return (
    <div className="card glass-card p-3 flex flex-col gap-2.5 w-full max-w-sm mx-auto min-h-[260px]">
      <div className="flex gap-2.5 items-center">
        {trip.imageUrl && (
          <img src={trip.imageUrl} alt={trip.name} className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl object-cover flex-shrink-0" />
        )}
        <div className="grid gap-1 min-w-0 flex-1">
          <Link to={`/trip/${trip.id}`} style={{ fontWeight: 600, color: 'inherit', textDecoration: 'none' }} className="truncate-1" title={trip.name}>
            {short(trip.name, 28)}
          </Link>
          <div className="muted truncate-1" title={`${trip.origin || ''} → ${trip.destination || ''}`}>
            {short(trip.origin || 'Origen ?', 22)} → {short(trip.destination || 'Destino ?', 22)}
          </div>
          {dateRange && <div className="muted truncate-1">{dateRange}</div>}
          {trip.country && <div className="muted truncate-1">{short(trip.country, 30)}</div>}
        </div>
      </div>
      <div className="flex gap-2 flex-wrap items-center text-sm">
        {budget && <span className="muted text-xs">Presupuesto: {budget}</span>}
        {trip.roomType && <span className="muted text-xs">Habitación: {trip.roomType}</span>}
        {trip.season && <span className="muted text-xs">Temporada: {trip.season}</span>}
        {occupancy && <span className="muted text-xs">Cupos: {occupancy}</span>}
      </div>
      {trip.tags && trip.tags.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {trip.tags.map((t) => (
            <span key={t} className="muted text-xs border border-blue-200/25 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>
      )}
      <div className="actions mt-auto justify-between">
        {canEdit && (
          <button className="btn secondary" type="button" onClick={onEdit}>Editar</button>
        )}
        <div style={{ flex: 1 }} />
        {isMember ? (
          <button className="btn secondary" type="button" disabled={leaving} onClick={onLeave}>
            {isOwner ? (leaving ? 'Eliminando…' : 'Eliminar viaje') : (leaving ? 'Saliendo…' : 'Abandonar')}
          </button>
        ) : hasApplied ? (
          <button
            className="btn secondary"
            type="button"
            disabled={true}
            title="Ya enviaste una aplicación para este viaje"
          >
            Aplicación enviada
          </button>
        ) : (
          <button
            className="btn"
            type="button"
            disabled={joining || (trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants)}
            onClick={onApply || onJoin}
            title={(trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants) ? 'Cupos completos' : ''}
          >
            {joining ? 'Aplicando…' : (trip.maxParticipants && trip.currentParticipants != null && trip.currentParticipants >= trip.maxParticipants ? 'Sin cupo' : 'Aplicar')}
          </button>
        )}
      </div>
    </div>
  )
}


