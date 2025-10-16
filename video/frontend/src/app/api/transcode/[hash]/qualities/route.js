export async function GET(request, { params }) {
	try {
		const { hash } = await params;
		const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/video/${hash}/qualities`);
		const data = await resp.json();
		return new Response(JSON.stringify(data), { status: resp.status, headers: { 'content-type': 'application/json' } });
	} catch (err) {
		return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
	}
}
