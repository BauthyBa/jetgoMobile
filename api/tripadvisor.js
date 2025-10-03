export default async function handler(req, res) {
	// Simple serverless proxy to TripAdvisor Content API
	// Prevent exposing the API key to the client
	const apiKey = process.env.TRIPADVISOR_API_KEY;
	if (!apiKey) {
		return res.status(500).json({ error: 'Missing TRIPADVISOR_API_KEY server env' });
	}

	const { action = 'search', query = '', category = 'attractions', language = 'es', locationId } = req.query || {};

	try {
		let url = '';
		switch (action) {
			case 'search': {
				const searchQuery = String(query || '').trim();
				if (!searchQuery) {
					return res.status(400).json({ error: 'Missing query parameter' });
				}
				const params = new URLSearchParams({
					key: apiKey,
					searchQuery,
					category: String(category || 'attractions'),
					language: String(language || 'es'),
					// results: '10', // optional
				});
				url = `https://api.content.tripadvisor.com/api/v1/location/search?${params.toString()}`;
				break;
			}
			case 'details': {
				if (!locationId) {
					return res.status(400).json({ error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es') });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?${params.toString()}`;
				break;
			}
			case 'photos': {
				if (!locationId) {
					return res.status(400).json({ error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es'), limit: '5' });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/photos?${params.toString()}`;
				break;
			}
			case 'reviews': {
				if (!locationId) {
					return res.status(400).json({ error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es'), limit: '5' });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?${params.toString()}`;
				break;
			}
			default:
				return res.status(400).json({ error: 'Unsupported action' });
		}

		const response = await fetch(url, { headers: { Accept: 'application/json' } });
		if (!response.ok) {
			const text = await response.text();
			return res.status(response.status).json({ error: 'Upstream error', detail: text });
		}
		const data = await response.json();
		// Cache for a short time in edge/CDN (if applicable)
		res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
		return res.status(200).json(data);
	} catch (err) {
		return res.status(500).json({ error: 'Proxy failure', detail: String(err?.message || err) });
	}
}


