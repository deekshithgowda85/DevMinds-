// Direct browser execution API (bypasses Inngest)
import { NextRequest, NextResponse } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';
import { AgentPlanner } from '@/agent/planner';
import { AgentExecutor } from '@/agent/executor';
import { AgentObserver } from '@/agent/observer';
import { AgentState } from '@/agent/state';

export async function POST(request: NextRequest) {
  try {
    const { taskId, intent } = await request.json();
    
    console.log(`[Browser Execute] Starting task: ${taskId}, intent: ${intent}`);
    
    // Handle special commands
    if (intent.toLowerCase().includes('run youtube')) {
      return await handleYouTubeTest(taskId);
    }
    
    // Parse intent and create plan
    const planner = new AgentPlanner();
    const plan = planner.parseIntent(taskId, intent);
    AgentState.savePlan(plan);
    AgentState.updatePlanStatus(taskId, 'executing');
    
    // Execute steps in background (don't wait)
    executeTaskInBackground(taskId, plan);
    
    return NextResponse.json({
      success: true,
      taskId,
      plan,
    });
  } catch (error) {
    console.error('[Browser Execute] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function handleYouTubeTest(taskId: string) {
  console.log('[Browser Execute] YouTube test mode');
  
  const planner = new AgentPlanner();
  const plan = planner.parseIntent(taskId, 'Navigate to youtube.com');
  AgentState.savePlan(plan);
  AgentState.updatePlanStatus(taskId, 'executing');
  
  // Execute and start streaming
  executeTaskInBackground(taskId, plan);
  
  return NextResponse.json({
    success: true,
    taskId,
    plan,
    message: 'YouTube streaming started',
  });
}

async function executeTaskInBackground(taskId: string, plan: any) {
  const executor = new AgentExecutor();
  const observer = new AgentObserver();
  
  try {
    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      
      console.log(`[Background] Executing step ${i}: ${step.description}`);
      
      // Update step status
      AgentState.updateStepStatus(taskId, step.id, 'running');
      
      try {
        // Execute the action
        const result = await executor.retry(step);
        
        // Mark step as completed
        AgentState.updateStepStatus(taskId, step.id, 'completed', result);
        AgentState.advanceStep(taskId);
        
        // Capture screenshot after action
        const screenshot = await observer.captureScreenshot();
        const browserState = await observer.observe();
        
        console.log(`[Background] Screenshot captured:`, screenshot ? screenshot.length : 0, 'chars');
        
        // Save to state
        AgentState.updateScreenshot(taskId, screenshot, browserState);
        
        console.log(`[Background] Step ${i} completed, screenshot captured`);
        
        // Wait between steps
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        AgentState.updateStepStatus(taskId, step.id, 'failed', undefined, errorMsg);
        console.error(`[Background] Step ${i} failed:`, error);
      }
    }
    
    // Mark task as completed
    AgentState.updatePlanStatus(taskId, 'completed');
    console.log(`[Background] Task ${taskId} completed`);
  } catch (error) {
    console.error(`[Background] Task ${taskId} failed:`, error);
    AgentState.updatePlanStatus(taskId, 'failed');
  }
}
