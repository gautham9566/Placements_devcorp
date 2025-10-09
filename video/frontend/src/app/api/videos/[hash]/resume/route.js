export async function PUT(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/${hash}/resume`, { method: 'PUT' });
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}