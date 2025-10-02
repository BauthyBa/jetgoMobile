import { useEffect, useMemo, useState } from 'react'

export default function TripFilters({ baseTrips, onFilter }) {
  const [query, setQuery] = useState('')
  const [season, setSeason] = useState('')
  const [roomType, setRoomType] = useState('')
  const [country, setCountry] = useState('')

  const countries = useMemo(() => {
    const set = new Set()
    for (const t of baseTrips || []) {
      if (t?.raw?.country) set.add(t.raw.country)
    }
    return Array.from(set)
  }, [baseTrips])

  useEffect(() => {
    const q = query.trim().toLowerCase()
    const filtered = (baseTrips || []).filter((t) => {
      if (season && t.season !== season) return false
      if (roomType && t.roomType !== roomType) return false
      if (country && t?.raw?.country !== country) return false
      if (!q) return true
      const haystack = [t.name, t.destination, t.origin, ...(t.tags || [])].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
    onFilter(filtered)
  }, [query, season, roomType, country, baseTrips, onFilter])

  return (
    <div className="card glass-card" style={{ marginTop: 16 }}>
      <div className="form" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
        <div className="field">
          <label>Buscar</label>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Destino, tags..." />
        </div>
        <div className="field">
          <label>Temporada</label>
          <select value={season} onChange={(e) => setSeason(e.target.value)}>
            <option value="">Todas</option>
            <option value="spring">Primavera</option>
            <option value="summer">Verano</option>
            <option value="autumn">Otoño</option>
            <option value="winter">Invierno</option>
            <option value="any">Cualquiera</option>
          </select>
        </div>
        <div className="field">
          <label>Habitación</label>
          <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option value="">Todas</option>
            <option value="shared">Compartida</option>
            <option value="private">Privada</option>
            <option value="both">Ambas</option>
          </select>
        </div>
        <div className="field">
          <label>País</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">Todos</option>
            {countries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}


