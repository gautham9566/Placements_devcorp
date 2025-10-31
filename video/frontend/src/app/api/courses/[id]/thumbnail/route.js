export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/thumbnail`);

    if (!response.ok) {
      return new Response('Thumbnail not found', { status: 404 });
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error fetching course thumbnail:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Forward to course service
    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}/thumbnail`, {
      method: 'POST',
      body: backendFormData,
    });

    if (!response.ok) {
      return Response.json({ error: 'Upload failed' }, { status: response.status });
    }

    const result = await response.json();
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}