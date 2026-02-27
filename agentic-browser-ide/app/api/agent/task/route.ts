// Agent task creation API
import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '@/inngest/client';
import { EVENTS } from '@/lib/constants';
import { AgentPlanner } from '@/agent/planner';
import { AgentState } from '@/agent/state';

export async function POST(request: NextRequest) {
  try {
    const { taskId, intent } = await request.json();
    
    if (!taskId || !intent) {
      return NextResponse.json(
        { error: 'taskId and intent are required' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Creating task: ${taskId}`);
    console.log(`[API] Intent: ${intent}`);
    
    // Create plan
    const planner = new AgentPlanner();
    const plan = planner.parseIntent(taskId, intent);
    AgentState.savePlan(plan);
    
    // Start task via Inngest
    await inngest.send({
      name: EVENTS.TASK_STARTED,
      data: { taskId, intent },
    });
    
    return NextResponse.json({
      success: true,
      taskId,
      plan,
    });
  } catch (error) {
    console.error('[API] Task creation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
