import { NextResponse } from 'next/server';

const ENGAGEMENT_SERVICE_URL = process.env.ENGAGEMENT_SERVICE_URL || 'http://127.0.0.1:8007';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${ENGAGEMENT_SERVICE_URL}/views`, {
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
    console.error('Error recording view:', error);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}
