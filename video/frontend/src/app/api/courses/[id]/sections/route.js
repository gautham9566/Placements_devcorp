import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = 'http://localhost:8006';

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