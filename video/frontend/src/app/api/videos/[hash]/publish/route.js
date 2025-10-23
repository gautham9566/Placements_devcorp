const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${BASE}/videos/${hash}/publish`, { method: 'POST' });
    const text = await resp.text();
    return new Response(text, { 
      status: resp.status, 
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

