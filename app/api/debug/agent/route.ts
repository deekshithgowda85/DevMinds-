import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/lib/inngest/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, filepath, sessionId } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: code and language' },
        { status: 400 }
      );
    }

    console.log('[Debug Agent API] Triggering agent-powered debug for', language);

    // Send event to the debug agent
    const { ids } = await inngest.send({
      name: 'debug/analyze',
      data: {
        code,
        language,
        filepath: filepath || 'untitled',
        sessionId: sessionId || Date.now().toString(),
      },
    });

    console.log('[Debug Agent API] Event sent:', ids[0]);

    return NextResponse.json({
      success: true,
      eventId: ids[0],
      message: 'Debug agent workflow started',
    });
  } catch (error) {
    console.error('[Debug Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start debug agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
