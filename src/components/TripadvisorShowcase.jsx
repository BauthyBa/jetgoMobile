import { useEffect, useMemo, useState } from 'react'
import { searchLocations, getLocationDetails, getLocationPhotos } from '@/services/tripadvisor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function TripadvisorShowcase() {
	const [query, setQuery] = useState('Buenos Aires')
	const [loading, setLoading] = useState(false)
	const [results, setResults] = useState([])
	const [error, setError] = useState('')

	useEffect(() => {
		let mounted = true
		async function load() {
			try {
				setLoading(true)
				setError('')
				const found = await searchLocations(query, { category: 'attractions', language: 'es' })
				if (!mounted) return
				// Enriquecer top 4 con detalles y foto principal
				const top = (found || []).slice(0, 4)
				const enriched = await Promise.all(
					top.map(async (loc) => {
						const [details, photos] = await Promise.all([
							getLocationDetails(loc.location_id || loc.id, { language: 'es' }),
							getLocationPhotos(loc.location_id || loc.id, { language: 'es', limit: 1 }),
						])
						return {
							id: loc.location_id || loc.id,
							name: details?.name || loc.name,
							rating: Number(details?.rating || loc.rating || 0),
							address: details?.address_obj?.address_string || details?.address || '',
							web_url: details?.web_url || loc.web_url,
							photo: photos?.[0]?.images?.large?.url || photos?.[0]?.images?.original?.url || '',
						}
					})
				)
				if (!mounted) return
				setResults(enriched)
			} catch (e) {
				if (!mounted) return
				setError('No pudimos cargar recomendaciones ahora.')
			} finally {
				if (mounted) setLoading(false)
			}
		}
		load()
		return () => {
			mounted = false
		}
	}, [query])

	const header = useMemo(() => (
		<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<h2 className="text-2xl md:text-3xl font-semibold">Recomendados en TripAdvisor</h2>
			<div className="flex gap-2">
				<Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ciudad o destino" />
				<Button onClick={() => setQuery((q) => q.trim())} disabled={loading}>Buscar</Button>
			</div>
		</div>
	), [query, loading])

	return (
		<section className="py-16 px-4 md:px-8 bg-slate-900/60">
			<div className="max-w-6xl mx-auto space-y-8">
				{header}
				{error && <p className="text-red-300">{error}</p>}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{(loading ? Array.from({ length: 4 }) : results).map((item, idx) => (
						<div key={item?.id || idx} className="rounded-xl overflow-hidden bg-slate-800/80 border border-slate-700/60">
							<div className="aspect-video bg-slate-700/50">
								{!loading && item?.photo && (
									<img src={item.photo} alt={item?.name || 'Foto'} className="w-full h-full object-cover" loading="lazy" />
								)}
							</div>
							<div className="p-4 space-y-1">
								<p className="font-medium line-clamp-1">{loading ? 'Cargando…' : item?.name}</p>
								{!loading && (
									<p className="text-sm text-slate-300 line-clamp-2">{item?.address}</p>
								)}
								{!loading && item?.rating > 0 && (
									<p className="text-sm text-amber-300">★ {item.rating.toFixed(1)}</p>
								)}
								{!loading && item?.web_url && (
									<a href={item.web_url} target="_blank" rel="noreferrer" className="text-teal-300 text-sm hover:underline">Ver en TripAdvisor</a>
								)}
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	)
}


