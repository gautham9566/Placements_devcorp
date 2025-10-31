import { NextResponse } from 'next/server';

const ENGAGEMENT_SERVICE_URL = process.env.ENGAGEMENT_SERVICE_URL || 'http://127.0.0.1:8007';

export async function GET(request, { params }) {
  try {
    const { searchParams } = new URL(request.url);
    const lms_username = searchParams.get('lms_username');
    const { content_type, content_id } = params;

    let url = `${ENGAGEMENT_SERVICE_URL}/stats/${content_type}/${content_id}`;
    if (lms_username) {
      url += `?lms_username=${lms_username}`;
    }

    const response = await fetch(url);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching engagement stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch engagement stats' },
      { status: 500 }
    );
  }
}
