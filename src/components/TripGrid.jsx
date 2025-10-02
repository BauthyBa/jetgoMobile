import TripCard from './TripCard'

export default function TripGrid({ trips, onJoin, joiningId }) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      {(trips || []).map((t) => (
        <TripCard key={t.id} trip={t} joining={joiningId === t.id} onJoin={() => onJoin(t)} />
      ))}
    </div>
  )
}


