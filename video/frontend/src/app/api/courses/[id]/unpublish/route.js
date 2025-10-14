import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = 'http://localhost:8006';

export async function POST(request, { params }) {
  try {
    const { id } = await params;

    const response = await fetch(`${COURSE_SERVICE_URL}/api/courses/${id}/unpublish`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Failed to unpublish course');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error unpublishing course:', error);
    return NextResponse.json({ error: 'Failed to unpublish course' }, { status: 500 });
  }
}