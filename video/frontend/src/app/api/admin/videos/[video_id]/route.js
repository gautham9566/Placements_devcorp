const BASE = process.env.NEXT_PUBLIC_API_URL;

export async function DELETE(request, { params }) {
  try {
    const { video_id } = await params;
    const resp = await fetch(`${BASE}/admin/videos/${video_id}`, { method: 'DELETE' });
    const text = await resp.text();
    return new Response(text, { 
      status: resp.status, 
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } 
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

