import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

  const response = await fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/sections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error('Failed to create section');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json({ error: 'Failed to create section' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle bulk update for reordering
    if (Array.isArray(body)) {
      const promises = body.map(section =>
  fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/sections/${section.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ order: section.order }),
        })
      );

      const responses = await Promise.all(promises);
      const failed = responses.filter(r => !r.ok);

      if (failed.length > 0) {
        throw new Error('Failed to update some sections');
      }

      return NextResponse.json({ message: 'Sections reordered successfully' });
    }

    // Handle single section update
    const { sectionId, ...updateData } = body;
    const response = await fetch(`${COURSE_SERVICE_URL}/courses/${id}/sections/${sectionId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    if (!response.ok) {
      throw new Error('Failed to update section');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json({ error: 'Failed to update section' }, { status: 500 });
  }
}