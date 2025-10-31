export async function POST(request, { params }) {
	try {
		const { hash } = await params;
		let body = {};
		try {
			body = await request.json();
		} catch (err) {
			body = {};
		}
		const url = `${process.env.NEXT_PUBLIC_API_URL}/transcode/${hash}`;
		console.log('[Transcode API] POST request to:', url);
		console.log('[Transcode API] Body:', body);

		const resp = await fetch(url, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});

		console.log('[Transcode API] Response status:', resp.status);
		const text = await resp.text();
		console.log('[Transcode API] Response body:', text);

		return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
	} catch (err) {
		console.error('[Transcode API] Error:', err);
		return new Response(JSON.stringify({ error: 'Proxy error', details: err.message }), { status: 500 });
	}
}
