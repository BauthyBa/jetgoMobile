import TripCard from './TripCard'

export default function TripGrid({ trips, onJoin, onLeave, joiningId, leavingId, onEdit, canEdit, isMemberFn, isOwnerFn, onApply, hasAppliedFn }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 justify-center">
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
          onApply={onApply ? () => onApply(t) : undefined}
          hasApplied={!!hasAppliedFn && hasAppliedFn(t)}
        />
      ))}
    </div>
  )
}


