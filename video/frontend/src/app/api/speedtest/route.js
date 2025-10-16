export async function GET() {
  try {
    const resp = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/speedtest`);
    if (!resp.ok) return new Response('Speedtest failed', { status: resp.status });
    const blob = await resp.blob();
    return new Response(blob, { status: 200, headers: { 'content-type': resp.headers.get('content-type') || 'application/octet-stream' } });
  } catch (err) {
    return new Response('Proxy error', { status: 500 });
  }
}
