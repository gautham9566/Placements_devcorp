export async function DELETE(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/${hash}`, { method: 'DELETE' });
    if (resp.status === 404) {
      // Video already deleted, treat as success
      return new Response(JSON.stringify({ status: "deleted" }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { hash } = await params;
    const body = await request.json();
    const action = body.action; // 'stop' or 'resume'
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos/${hash}/${action}`, { method: 'PUT' });
    const text = await resp.text();
    return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}
