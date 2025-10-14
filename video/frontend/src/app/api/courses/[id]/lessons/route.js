import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

  const response = await fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to create lesson');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle bulk update for reordering
    if (Array.isArray(body)) {
      const promises = body.map(lesson =>
  fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/lessons/${lesson.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order: lesson.order }),
        })
      );

      const responses = await Promise.all(promises);
      const failed = responses.filter(r => !r.ok);

      if (failed.length > 0) {
        throw new Error('Failed to update some lessons');
      }

      return NextResponse.json({ message: 'Lessons reordered successfully' });
    }

    // Handle single lesson update
    const { lessonId, ...updateData } = body;
  const response = await fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/lessons/${lessonId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update lesson');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({ error: 'Failed to update lesson' }, { status: 500 });
  }
}