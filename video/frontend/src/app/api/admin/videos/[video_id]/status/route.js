const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request, { params }) {
  try {
    const { video_id } = await params;
    const resp = await fetch(`${BASE}/admin/videos/${video_id}/status`);
    const data = await resp.json();
    return new Response(JSON.stringify(data), { 
      status: resp.status, 
      headers: { 'content-type': 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

