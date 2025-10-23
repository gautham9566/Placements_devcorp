const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request) {
  try {
    const body = await request.json();
    const resp = await fetch(`${BASE}/course-videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    return new Response(JSON.stringify(data), { 
      status: resp.status, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

