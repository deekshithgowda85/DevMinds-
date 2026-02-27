// Sandbox Cleanup Endpoint - Force cleanup of all sandboxes
import { NextRequest, NextResponse } from 'next/server';
import { SandboxManager } from '@/e2b/sandbox-manager';

export async function POST(request: NextRequest) {
  try {
    const { force = false } = await request.json().catch(() => ({ force: false }));
    
    console.log(`[Cleanup] Starting sandbox cleanup (force: ${force})`);
    
    const manager = SandboxManager.getInstance();
    const result = await manager.cleanupAll(force);
    
    console.log(`[Cleanup] Cleanup complete - ${result.closed} sandboxes closed`);
    
    return NextResponse.json({
      success: true,
      closed: result.closed,
      remaining: result.remaining,
      errors: result.errors,
    });
  } catch (error) {
    console.error('[Cleanup] Cleanup failed:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const manager = SandboxManager.getInstance();
    const stats = manager.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('[Cleanup] Failed to get stats:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
