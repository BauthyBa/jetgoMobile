import TripCard from './TripCard'

export default function TripGrid({ trips, onJoin, joiningId, onEdit, canEdit }) {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {(trips || []).map((t) => (
        <TripCard
          key={t.id}
          trip={t}
          joining={joiningId === t.id}
          onJoin={() => onJoin(t)}
          onEdit={onEdit ? () => onEdit(t) : undefined}
          canEdit={!!canEdit && canEdit(t)}
        />
      ))}
    </div>
  )
}


