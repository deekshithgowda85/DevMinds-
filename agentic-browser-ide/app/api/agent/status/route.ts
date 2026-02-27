// Agent status API
import { NextRequest, NextResponse } from 'next/server';
import { AgentState } from '@/agent/state';
import { AgentObserver } from '@/agent/observer';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');
    
    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }
    
    const plan = AgentState.getPlan(taskId);
    
    if (!plan) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    
    // Get stored browser state and screenshot
    const browserState = AgentState.getBrowserState(taskId) || await new AgentObserver().observe();
    const screenshot = AgentState.getScreenshot(taskId) || '';
    
    return NextResponse.json({
      plan,
      browserState,
      screenshot,
    });
  } catch (error) {
    console.error('[API] Status check failed:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
