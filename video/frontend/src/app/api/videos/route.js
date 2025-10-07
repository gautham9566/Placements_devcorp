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