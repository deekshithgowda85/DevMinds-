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

    console.log('[Code Editor Agent API] Triggering agent-powered code editor for', language);

    // Send event to the code editor agent
    const { ids } = await inngest.send({
      name: 'code-editor/fix',
      data: {
        code,
        language,
        filepath: filepath || 'untitled',
        sessionId: sessionId || Date.now().toString(),
      },
    });

    console.log('[Code Editor Agent API] Event sent:', ids[0]);

    return NextResponse.json({
      success: true,
      eventId: ids[0],
      message: 'Code editor agent workflow started',
    });
  } catch (error) {
    console.error('[Code Editor Agent API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to start code editor agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
