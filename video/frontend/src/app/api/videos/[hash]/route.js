export async function DELETE(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`http://localhost:9000/videos/${hash}`, { method: 'DELETE' });
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}
