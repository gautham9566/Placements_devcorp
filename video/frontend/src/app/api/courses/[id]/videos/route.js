import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    // Fetch videos for this specific course from course service via admin service
    const response = await fetch(`${API_URL}/api/courses/${id}/videos`);

    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch course videos' }, { status: response.status });
    }

    const data = await response.json();
    // The admin service already unwraps the videos array, so just return it
    return NextResponse.json(Array.isArray(data) ? data : (data.videos || []));
  } catch (error) {
    console.error('Error fetching course videos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

