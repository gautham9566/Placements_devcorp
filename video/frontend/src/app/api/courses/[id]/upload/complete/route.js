const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const formData = await request.formData();

    // Add course_id to the form data
    formData.append('course_id', id);

    const resp = await fetch(`${API_URL}/upload/complete`, {
      method: 'POST',
      body: formData,
    });

    const data = await resp.text();
    return new Response(data, {
      status: resp.status,
      headers: { 'content-type': resp.headers.get('content-type') || 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Proxy error' }), { status: 500 });
  }
}

