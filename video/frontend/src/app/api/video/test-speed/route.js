export async function GET() {
  // Return a larger test file for more accurate network speed measurement
  // This creates a 50KB response for speed testing
  const testData = 'x'.repeat(51200); // 50KB of data

  return new Response(testData, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': testData.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}