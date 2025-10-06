export async function GET(request, { params }) {
  try {
    const { hash } = await params;
    const incomingUrl = new URL(request.url);
    const upstreamUrl = new URL(`http://localhost:9000/video/${hash}`);

    incomingUrl.searchParams.forEach((value, key) => {
      upstreamUrl.searchParams.set(key, value);
    });

    const upstreamResponse = await fetch(upstreamUrl, {
      headers: {
        accept: request.headers.get('accept') ?? '*/*',
      },
    });

    const headers = new Headers(upstreamResponse.headers);
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