const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function DELETE(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${BASE}/videos/${hash}`, { method: 'DELETE' });
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

export async function POST(request, { params }) {
  try {
    const { hash } = await params;
    // Publish action
    const resp = await fetch(`${BASE}/videos/${hash}/publish`, { method: 'POST' });
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
    if (body.action) {
      // stop or resume
      const action = body.action;
      const resp = await fetch(`${BASE}/videos/${hash}/${action}`, { method: 'PUT' });
      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
    } else {
      // update video
      const resp = await fetch(`${BASE}/videos/${hash}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await resp.text();
      return new Response(text, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}
