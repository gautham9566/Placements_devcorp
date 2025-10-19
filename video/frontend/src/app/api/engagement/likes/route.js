import { NextResponse } from 'next/server';

const ENGAGEMENT_SERVICE_URL = process.env.ENGAGEMENT_SERVICE_URL || 'http://127.0.0.1:8007';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${ENGAGEMENT_SERVICE_URL}/likes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating like:', error);
    return NextResponse.json(
      { error: 'Failed to create like' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const lms_username = searchParams.get('lms_username');
    const content_type = searchParams.get('content_type');
    const content_id = searchParams.get('content_id');

    if (!lms_username || !content_type || !content_id) {
      return NextResponse.json(
        { error: 'lms_username, content_type, and content_id are required' },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${ENGAGEMENT_SERVICE_URL}/likes?lms_username=${lms_username}&content_type=${content_type}&content_id=${content_id}`,
      {
        method: 'DELETE',
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error removing like:', error);
    return NextResponse.json(
      { error: 'Failed to remove like' },
      { status: 500 }
    );
  }
}
