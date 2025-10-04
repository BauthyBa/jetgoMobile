function sendJson(res, statusCode, body) {
	try {
		if (typeof res.status === 'function' && typeof res.json === 'function') {
			return res.status(statusCode).json(body)
		}
	} catch {}
	res.statusCode = statusCode
	try { res.setHeader('Content-Type', 'application/json; charset=utf-8') } catch {}
	try { res.end(JSON.stringify(body)) } catch {}
}

export default async function handler(req, res) {
    // Simple serverless proxy to TripAdvisor Content API
    // Prevent exposing the API key to the client
	const apiKey = process.env.TRIPADVISOR_API_KEY || process.env.VITE_TRIPADVISOR_API_KEY || '1821739E0B4D43DFBD7DD3C133FFD627';
	if (!apiKey) {
		return sendJson(res, 500, { error: 'Missing TRIPADVISOR_API_KEY server env' });
	}

    // Support both environments: Next/Vercel (req.query) and plain Node (req.url)
    let parsedQuery = {};
    try {
        const u = new URL(req.url, 'http://localhost');
        parsedQuery = Object.fromEntries(u.searchParams.entries());
    } catch {}
    const { action = 'search', query = '', category = 'attractions', language = 'es', locationId } = (req.query || parsedQuery || {});

	try {
		let url = '';
		switch (action) {
			case 'search': {
				const searchQuery = String(query || '').trim();
				if (!searchQuery) {
					return sendJson(res, 400, { error: 'Missing query parameter' });
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
					return sendJson(res, 400, { error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es') });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/details?${params.toString()}`;
				break;
			}
			case 'photos': {
				if (!locationId) {
					return sendJson(res, 400, { error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es'), limit: '5' });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/photos?${params.toString()}`;
				break;
			}
			case 'reviews': {
				if (!locationId) {
					return sendJson(res, 400, { error: 'Missing locationId parameter' });
				}
				const params = new URLSearchParams({ key: apiKey, language: String(language || 'es'), limit: '5' });
				url = `https://api.content.tripadvisor.com/api/v1/location/${locationId}/reviews?${params.toString()}`;
				break;
			}
			default:
				return sendJson(res, 400, { error: 'Unsupported action' });
		}

		const response = await fetch(url, { headers: { Accept: 'application/json' } });
		if (!response.ok) {
			const text = await response.text();
			return sendJson(res, response.status, { error: 'Upstream error', detail: text });
		}
		const data = await response.json();
		// Cache for a short time in edge/CDN (if applicable)
		try { res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600'); } catch {}
		return sendJson(res, 200, data);
	} catch (err) {
		return sendJson(res, 500, { error: 'Proxy failure', detail: String(err?.message || err) });
	}
}


