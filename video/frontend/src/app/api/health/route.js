const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET() {
  try {
    const resp = await fetch(`${BASE}/health`);
    const data = await resp.json();
    return new Response(JSON.stringify(data), { 
      status: resp.status, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error', status: 'unhealthy' }), { status: 500 });
  }
}

