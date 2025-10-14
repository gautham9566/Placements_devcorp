import { NextResponse } from 'next/server';

const COURSE_SERVICE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const response = await fetch(`${COURSE_SERVICE_URL}/courses/${id}/lessons`, {
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