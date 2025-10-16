export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos`);
    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch videos' }, { status: response.status });
    }
    const videos = await response.json();
    return Response.json(videos);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      return Response.json({ error: 'Failed to create video metadata' }, { status: response.status });
    }
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}