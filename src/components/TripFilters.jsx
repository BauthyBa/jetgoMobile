import { useEffect, useMemo, useState } from 'react'

export default function TripFilters({ baseTrips, onFilter }) {
	const [query, setQuery] = useState('')
	const [origin, setOrigin] = useState('')
	const [destination, setDestination] = useState('')
	const [dateFrom, setDateFrom] = useState('')
	const [dateTo, setDateTo] = useState('')
	const [minBudget, setMinBudget] = useState('')
	const [maxBudget, setMaxBudget] = useState('')
	const [status, setStatus] = useState('')
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

	const statuses = useMemo(() => {
		const set = new Set()
		for (const t of baseTrips || []) {
			if (t?.status) set.add(t.status)
		}
		return Array.from(set)
	}, [baseTrips])


	function applyFilters() {
		const q = query.trim().toLowerCase()
		const o = origin.trim().toLowerCase()
		const d = destination.trim().toLowerCase()
		const from = dateFrom ? new Date(dateFrom) : null
		const to = dateTo ? new Date(dateTo) : null
		const minB = minBudget !== '' ? Number(minBudget) : null
		const maxB = maxBudget !== '' ? Number(maxBudget) : null

		const filtered = (baseTrips || []).filter((t) => {
			if (status && t.status !== status) return false
			if (season && t.season !== season) return false
			if (roomType && t.roomType !== roomType) return false
			if (country && t?.raw?.country !== country) return false
			if (o && !(t.origin || '').toLowerCase().includes(o)) return false
			if (d && !(t.destination || '').toLowerCase().includes(d)) return false
			const start = t.startDate ? new Date(t.startDate) : null
			const end = t.endDate ? new Date(t.endDate) : start
			if (from && start && start < from) return false
			if (to && end && end > to) return false
			const tripMin = t.budgetMin ?? t.budgetMax ?? 0
			const tripMax = t.budgetMax ?? t.budgetMin ?? Number.POSITIVE_INFINITY
			if (minB !== null && tripMax < minB) return false
			if (maxB !== null && tripMin > maxB) return false
			if (!q) return true
			const haystack = [t.name, t.destination, t.origin, ...(t.tags || [])]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			return haystack.includes(q)
		})
		onFilter(filtered)
	}

	function clearAll() {
		setQuery('')
		setOrigin('')
		setDestination('')
		setDateFrom('')
		setDateTo('')
		setMinBudget('')
		setMaxBudget('')
		setStatus('')
		setSeason('')
		setRoomType('')
		setCountry('')
		onFilter(baseTrips || [])
	}

	return (
		<div className="card glass-card" style={{ marginTop: 16 }}>
			<div className="form" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
				<div className="field">
					<label>Buscar</label>
					<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, tags..." />
				</div>
				<div className="field">
					<label>Origen</label>
					<input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="Ej: Buenos Aires" />
				</div>
				<div className="field">
					<label>Destino</label>
					<input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Ej: Bariloche" />
				</div>
				<div className="field">
					<label>Estado</label>
					<select value={status} onChange={(e) => setStatus(e.target.value)}>
						<option value="">Todos</option>
						{statuses.map((s) => (
							<option key={s} value={s}>{s}</option>
						))}
					</select>
				</div>

				<div className="field">
					<label>Desde</label>
					<input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
				</div>
				<div className="field">
					<label>Hasta</label>
					<input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
				</div>
				<div className="field">
					<label>Presupuesto mín.</label>
					<input type="number" inputMode="numeric" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} placeholder="0" />
				</div>
				<div className="field">
					<label>Presupuesto máx.</label>
					<input type="number" inputMode="numeric" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="9999" />
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
			<div className="actions" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
				<button className="btn secondary" type="button" onClick={clearAll}>Limpiar</button>
				<button className="btn" type="button" onClick={applyFilters}>Buscar</button>
			</div>
		</div>
	)
}


