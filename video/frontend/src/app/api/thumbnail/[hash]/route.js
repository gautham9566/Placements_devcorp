export async function GET(request, { params }) {
  try {
    const { hash } = await params;

    const response = await fetch(`http://localhost:8000/thumbnail/${hash}`);

    if (!response.ok) {
      return new Response('Thumbnail not found', { status: 404 });
    }

    const blob = await response.blob();

    return new Response(blob, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error) {
    return new Response('Internal server error', { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const { hash } = await params;
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch(`http://localhost:8000/thumbnail/${hash}`, {
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