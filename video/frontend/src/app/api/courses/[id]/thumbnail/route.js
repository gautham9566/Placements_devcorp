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