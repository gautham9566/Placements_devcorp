import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function PUT(request, { params }) {
  try {
    const { id, lessonId } = await params;
    const body = await request.json();

    const response = await fetch(`${COURSE_SERVICE_URL}/courses/${id}/lessons/${lessonId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '<no-body>');
      console.error(`Upstream lesson update failed: status=${response.status} body=${text}`);
      return NextResponse.json({ error: 'Failed to update lesson', upstream: { status: response.status, body: text } }, { status: 500 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
  }
}