import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { path } = await params;
    const thumbnailPath = Array.isArray(path) ? path.join('/') : path;
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/thumbnails/${thumbnailPath}`);
    
    if (!response.ok) {
      return new NextResponse('Thumbnail not found', { status: 404 });
    }

    const blob = await response.blob();
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': response.headers.get('content-type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error proxying thumbnail:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
