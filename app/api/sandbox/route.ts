import { NextRequest, NextResponse } from 'next/server';
import { E2BSandboxManager } from '@/lib/e2b-sandbox';
import { setSandboxInstance, getOrReconnectSandbox, deleteSandboxInstance } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const maxDuration = 60;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST() {
  try {
    console.log('POST /api/sandbox - Initializing new sandbox...');
    
    const apiKey = process.env.E2B_API_KEY;
    if (!apiKey) {
      console.error('E2B_API_KEY not configured');
      return NextResponse.json(
        { error: 'E2B_API_KEY not configured' },
        { status: 500, headers: corsHeaders }
      );
    }

    const sandbox = new E2BSandboxManager(apiKey);

    // Race the initialization against a timeout so we return proper JSON
    // before Vercel kills the function (Hobby plan = 10 s).
    const INIT_TIMEOUT_MS = 9000;
    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Sandbox initialization timed out. Try again or upgrade Vercel plan for longer function duration.')), INIT_TIMEOUT_MS)
    );

    await Promise.race([sandbox.initialize(), timer]);

    const sandboxId = sandbox.getSandboxId()!;
    console.log('Sandbox initialized with ID:', sandboxId);

    // Key the cache by the E2B sandboxId so sub-routes can reconnect on Vercel cold starts
    setSandboxInstance(sandboxId, sandbox);
    console.log('Sandbox instance stored in map');

    return NextResponse.json({
      sessionId: sandboxId,   // use sandboxId as sessionId for reconnect support
      sandboxId,
      message: 'Sandbox initialized successfully',
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Sandbox initialization error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize sandbox' },
      { status: 500, headers: corsHeaders }
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
        { status: 400, headers: corsHeaders }
      );
    }

    const sandbox = await getOrReconnectSandbox(sessionId);
    if (sandbox) {
      await sandbox.close();
      deleteSandboxInstance(sessionId);
    }

    return NextResponse.json({ message: 'Sandbox closed successfully' }, { headers: corsHeaders });
  } catch (error) {
    console.error('Sandbox close error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to close sandbox' },
      { status: 500, headers: corsHeaders }
    );
  }
}
