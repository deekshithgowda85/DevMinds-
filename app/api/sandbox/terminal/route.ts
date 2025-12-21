import { NextRequest, NextResponse } from 'next/server';
import { getSandboxInstance } from '@/lib/sandbox-instances';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, action, data, cols, rows } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, action' },
        { status: 400 }
      );
    }

    const sandbox = getSandboxInstance(sessionId);
    if (!sandbox) {
      return NextResponse.json(
        { error: 'Sandbox session not found' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start':
        const result = await sandbox.startTerminal();
        return NextResponse.json(result);

      case 'send':
        if (!data) {
          return NextResponse.json(
            { error: 'data required for send action' },
            { status: 400 }
          );
        }
        await sandbox.sendToTerminal(data);
        return NextResponse.json({ success: true });

      case 'resize':
        if (!cols || !rows) {
          return NextResponse.json(
            { error: 'cols and rows required for resize action' },
            { status: 400 }
          );
        }
        await sandbox.resizeTerminal(cols, rows);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Terminal operation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Terminal operation failed' },
      { status: 500 }
    );
  }
}
