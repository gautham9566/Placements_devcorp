import { NextResponse } from 'next/server';

const METADATA_SERVICE_URL = 'http://localhost:8003';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch videos for this specific course from metadata service
    const response = await fetch(`${METADATA_SERVICE_URL}/videos/course/${id}`);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch course videos' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data.videos || []);
  } catch (error) {
    console.error('Error fetching course videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

