import { NextRequest, NextResponse } from 'next/server';
import { E2BSandboxManager } from '@/lib/e2b-sandbox';
import { setSandboxInstance, getOrReconnectSandbox, deleteSandboxInstance } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  try {
    console.log('POST /api/sandbox - Initializing new sandbox...');
    
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      console.error('E2B_API_KEY not configured');
      return NextResponse.json(
        { error: 'E2B_API_KEY not configured' },
        { status: 500 }
      );
    }

    const sandbox = new E2BSandboxManager(apiKey);
    await sandbox.initialize();
    const sandboxId = sandbox.getSandboxId()!;
    console.log('Sandbox initialized with ID:', sandboxId);

    // Key the cache by the E2B sandboxId so sub-routes can reconnect on Vercel cold starts
    setSandboxInstance(sandboxId, sandbox);
    console.log('Sandbox instance stored in map');

    return NextResponse.json({
      sessionId: sandboxId,   // use sandboxId as sessionId for reconnect support
      sandboxId,
      message: 'Sandbox initialized successfully',
    });
  } catch (error) {
    console.error('Sandbox initialization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize sandbox' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    { message: 'OK' },
    {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    }
  );
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    const sandbox = await getOrReconnectSandbox(sessionId);
    if (sandbox) {
      await sandbox.close();
      deleteSandboxInstance(sessionId);
    }

    return NextResponse.json({ message: 'Sandbox closed successfully' });
  } catch (error) {
    console.error('Sandbox close error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to close sandbox' },
      { status: 500 }
    );
  }
}
