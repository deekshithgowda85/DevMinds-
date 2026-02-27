// Sandbox Health Check API
import { NextResponse } from 'next/server';
import { getSandboxManager } from '@/e2b/sandbox-manager';

export async function GET() {
  try {
    const manager = getSandboxManager();
    const stats = manager.getStats();
    
    return NextResponse.json({
      healthy: true,
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
