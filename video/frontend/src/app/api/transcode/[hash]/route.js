export async function POST(request, { params }) {
	try {
		const { hash } = await params;
		const body = await request.json();
		const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transcode/${hash}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
		const text = await resp.text();
		return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
	} catch (err) {
		return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
	}
}
