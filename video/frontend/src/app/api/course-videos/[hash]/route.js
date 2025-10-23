const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${BASE}/course-videos/${hash}`);
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch course video' }), { 
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

export async function PATCH(request, { params }) {
  try {
    const { hash } = await params;
    const body = await request.json();
    const resp = await fetch(`${BASE}/course-videos/${hash}`, {
      method: 'PATCH',
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

export async function DELETE(request, { params }) {
  try {
    const { hash } = await params;
    const resp = await fetch(`${BASE}/course-videos/${hash}`, { method: 'DELETE' });
    const text = await resp.text();
    return new Response(text, { 
      status: resp.status, 
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

