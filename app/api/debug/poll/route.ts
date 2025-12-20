import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId parameter' },
        { status: 400 }
      );
    }

    // In production, you would query the Inngest API for event status
    // For now, return a mock pending status
    // You can implement actual polling using Inngest's API

    console.log('[Poll Agent] Checking status for event:', eventId);

    return NextResponse.json({
      status: 'pending',
      message: 'Agent is still working...',
      eventId,
    });
  } catch (error) {
    console.error('[Poll Agent] Error:', error);
    return NextResponse.json(
      { error: 'Failed to poll agent status' },
      { status: 500 }
    );
  }
}
