export async function GET(request, { params }) {
	try {
		const { hash, path = [] } = await params;
		const segments = Array.isArray(path) ? path : [path];
		const encodedPath = segments.map((segment) => encodeURIComponent(segment)).join('/');
		const incomingUrl = new URL(request.url);
		const upstreamUrl = new URL(`${process.env.NEXT_PUBLIC_API_URL}/video/${hash}/${encodedPath}`);

		incomingUrl.searchParams.forEach((value, key) => {
			upstreamUrl.searchParams.set(key, value);
		});

		const upstreamResponse = await fetch(upstreamUrl, {
			headers: {
				accept: request.headers.get('accept') ?? '*/*',
			},
		});

		const headers = new Headers(upstreamResponse.headers);
		// Ensure playlists and TS segments have the correct Content-Type for HLS
		const lcPath = encodedPath.toLowerCase();
		if (lcPath.endsWith('.m3u8')) {
			headers.set('content-type', 'application/vnd.apple.mpegurl');
		} else if (lcPath.endsWith('.ts')) {
			headers.set('content-type', 'video/mp2t');
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
