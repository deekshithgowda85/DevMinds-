import { NextRequest, NextResponse } from 'next/server';
import { getOrReconnectSandbox } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const path = searchParams.get('path') || '/workspace/repo';

    console.log('[list files] GET /api/sandbox/files/list - Request:', { sessionId, path });

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required parameter: sessionId' },
        { status: 400 }
      );
    }

    console.log('[list files] Getting sandbox instance for sessionId:', sessionId);
    const sandbox = await getOrReconnectSandbox(sessionId);
    
    if (!sandbox) {
      console.error('[list files] Sandbox not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    console.log('[list files] Listing files in path:', path);
    const files = await sandbox.listFiles(path);

    console.log('[list files] Found', files.length, 'files');
    return NextResponse.json({
      success: true,
      path,
      files,
    });
  } catch (error) {
    console.error('[list files] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list files' },
      { status: 500 }
    );
  }
}
