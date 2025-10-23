export async function GET(request, { params }) {
  try {
    const { hash } = await params;
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/video/${hash}`);

    incomingUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        accept: request.headers.get('accept') ?? '*/*',
      },
    });

    const headers = new Headers(upstreamResponse.headers);
    // If the upstream is serving an m3u8 master playlist via this route, force content-type
    const urlPath = upstreamUrl.pathname || '';
    if (urlPath.toLowerCase().endsWith('.m3u8')) {
      headers.set('content-type', 'application/vnd.apple.mpegurl');
    }
    if (!headers.has('cache-control')) {
      headers.set('cache-control', 'no-store');
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}