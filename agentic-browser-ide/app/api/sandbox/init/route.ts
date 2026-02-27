// Sandbox initialization API
import { NextResponse } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';

export async function POST() {
  try {
    console.log('[API] Initializing sandbox...');
    
    const sandbox = await getBrowserSandbox();
    const sandboxId = sandbox.getSandboxId();
    
    return NextResponse.json({
      success: true,
      sandboxId,
    });
  } catch (error) {
    console.error('[API] Sandbox init failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
