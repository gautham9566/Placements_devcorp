import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PUT(request, { params }) {
  try {
    const { id, sectionId } = await params;
    const body = await request.json();

  const response = await fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/sections/${sectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // capture text body for debugging
      const text = await response.text().catch(() => '<no-body>');
      console.error(`Upstream section update failed: status=${response.status} body=${text}`);
      return NextResponse.json({ error: 'Failed to update section', upstream: { status: response.status, body: text } }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}