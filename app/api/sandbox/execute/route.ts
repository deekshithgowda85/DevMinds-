import { NextRequest, NextResponse } from 'next/server';
import { getSandboxInstance } from '@/lib/sandbox-instances';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, language, code, filename, command } = body;

    console.log('[execute] POST /api/sandbox/execute - Request:', { sessionId, language, filename, command });

    // Handle direct command execution
    if (sessionId && command) {
      console.log('[execute] Executing command:', command);
      const sandbox = getSandboxInstance(sessionId);
      
      if (!sandbox) {
        console.error('[execute] Sandbox not found for sessionId:', sessionId);
        return NextResponse.json(
          { error: 'Sandbox session not found. Please initialize first.' },
          { status: 404 }
        );
      }

      const result = await sandbox.runCommand(command);
      return NextResponse.json({
        success: result.exitCode === 0,
        ...result,
      });
    }

    // Handle code execution
    if (!sessionId || !language || !code) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, language, code' },
        { status: 400 }
      );
    }

    console.log('[execute] Getting sandbox instance for sessionId:', sessionId);
    const sandbox = getSandboxInstance(sessionId);
    
    if (!sandbox) {
      console.error('[execute] Sandbox not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: 'Sandbox session not found. Please initialize first.' },
        { status: 404 }
      );
    }

    console.log('[execute] Executing code in sandbox...');
    const result = await sandbox.executeCode(language, code, filename);

    return NextResponse.json({
      success: result.exitCode === 0,
      ...result,
    });
  } catch (error) {
    console.error('Code execution error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Execution failed' },
      { status: 500 }
    );
  }
}
