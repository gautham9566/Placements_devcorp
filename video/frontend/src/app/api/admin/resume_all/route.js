const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST() {
  try {
    const resp = await fetch(`${BASE}/admin/resume_all`, { method: 'POST' });
    const text = await resp.text();
    return new Response(text, { 
      status: resp.status, 
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

