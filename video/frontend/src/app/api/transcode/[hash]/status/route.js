export async function GET(request, { params }) {
	try {
		const { hash } = await params;
		const url = `${process.env.NEXT_PUBLIC_API_URL}/transcode/${hash}/status`;
		console.log('[Transcode Status API] GET request to:', url);

		const resp = await fetch(url);
		console.log('[Transcode Status API] Response status:', resp.status);

		const data = await resp.json();
		console.log('[Transcode Status API] Response data:', data);

		return new Response(JSON.stringify(data), { status: resp.status, headers: { 'content-type': 'application/json' } });
	} catch (err) {
		console.error('[Transcode Status API] Error:', err);
		return new Response(JSON.stringify({ error: 'Proxy error', details: err.message }), { status: 500 });
	}
}
