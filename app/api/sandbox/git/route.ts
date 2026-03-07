import { NextRequest, NextResponse } from 'next/server';
import { getOrReconnectSandbox } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, repoUrl, path, message, remote, branch } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, action' },
        { status: 400 }
      );
    }

    const sandbox = await getOrReconnectSandbox(sessionId);
    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'clone':
        if (!repoUrl) {
          return NextResponse.json(
            { error: 'repoUrl required for clone action' },
            { status: 400 }
          );
        }
        result = await sandbox.cloneRepository(repoUrl, path || '/workspace/repo');
        break;

      case 'commit':
        if (!path || !message) {
          return NextResponse.json(
            { error: 'path and message required for commit action' },
            { status: 400 }
          );
        }
        result = await sandbox.gitCommit(path, message);
        break;

      case 'push':
        if (!path) {
          return NextResponse.json(
            { error: 'path required for push action' },
            { status: 400 }
          );
        }
        result = await sandbox.gitPush(path, remote || 'origin', branch || 'main');
        break;

      case 'pull':
        if (!path) {
          return NextResponse.json(
            { error: 'path required for pull action' },
            { status: 400 }
          );
        }
        result = await sandbox.gitPull(path, remote || 'origin', branch || 'main');
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.exitCode === 0,
      ...result,
    });
  } catch (error) {
    console.error('Git operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Git operation failed' },
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
