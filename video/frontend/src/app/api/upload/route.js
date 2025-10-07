export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append('file', file);

    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/upload`, {
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