export async function POST(request) {
  try {
    const formData = await request.formData();

    const resp = await fetch('http://localhost:8000/upload/init', {
      method: 'POST',
      body: formData,
    });

    const data = await resp.text();
    return new Response(data, { status: resp.status, headers: { 'content-type': resp.headers.get('content-type') || 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}
