import TripCard from './TripCard'

export default function TripGrid({ trips, onJoin, onLeave, joiningId, leavingId, onEdit, canEdit, isMemberFn, isOwnerFn }) {
  return (
    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, 260px)', justifyContent: 'center' }}>
      {(trips || []).map((t) => (
        <TripCard
          key={t.id}
          trip={t}
          joining={joiningId === t.id}
          leaving={leavingId === t.id}
          onJoin={() => onJoin(t)}
          onLeave={() => onLeave && onLeave(t)}
          onEdit={onEdit ? () => onEdit(t) : undefined}
          canEdit={!!canEdit && canEdit(t)}
          isMember={!!isMemberFn && isMemberFn(t)}
          isOwner={!!isOwnerFn && isOwnerFn(t)}
        />
      ))}
    </div>
  )
}


