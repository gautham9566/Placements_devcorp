const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  try {
    const resp = await fetch(`${BASE}/admin/status`);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch system status' }), { 
        status: resp.status,
        headers: { 'content-type': 'application/json' }
      });
    }
    const data = await resp.json();
    return new Response(JSON.stringify(data), { 
      status: 200, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

