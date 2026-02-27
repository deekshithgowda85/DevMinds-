// Inngest Functions - Event-driven browser task execution
import { inngest } from './client';
import { EVENTS } from '@/lib/constants';
import { AgentPlanner } from '@/agent/planner';
import { AgentExecutor } from '@/agent/executor';
import { AgentObserver } from '@/agent/observer';
import { AgentState } from '@/agent/state';

// Task orchestration function
export const browserTaskFunction = inngest.createFunction(
  { id: 'browser-task', name: 'Browser Task Orchestrator' },
  { event: EVENTS.TASK_STARTED },
  async ({ event, step }) => {
    const { taskId, intent } = event.data;
    
    console.log(`[Inngest] Task started: ${taskId}`);
    
    // Step 1: Parse intent and create plan
    const plan = await step.run('create-plan', async () => {
      const planner = new AgentPlanner();
      const plan = planner.parseIntent(taskId, intent);
      AgentState.savePlan(plan);
      AgentState.updatePlanStatus(taskId, 'executing');
      return plan;
    });
    
    // Step 2: Execute each step
    for (let i = 0; i < plan.steps.length; i++) {
      const agentStep = plan.steps[i];
      
      await step.run(`execute-step-${i}`, async () => {
        console.log(`[Inngest] Executing step ${i}: ${agentStep.description}`);
        
        try {
          // Update step status
          AgentState.updateStepStatus(taskId, agentStep.id, 'running');
          
          // Execute the action
          const executor = new AgentExecutor();
          const result = await executor.retry(agentStep);
          
          // Mark step as completed
          AgentState.updateStepStatus(taskId, agentStep.id, 'completed', result);
          AgentState.advanceStep(taskId);
          
          // Capture screenshot and browser state after action
          const observer = new AgentObserver();
          const screenshot = await observer.captureScreenshot();
          const browserState = await observer.observe();
          
          // Save screenshot to state
          AgentState.updateScreenshot(taskId, screenshot, browserState);
          
          // Emit step completed event
          await inngest.send({
            name: EVENTS.STEP_COMPLETED,
            data: { taskId, stepId: agentStep.id, result, screenshot },
          });
          
          // Wait a bit between steps
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return result;
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          AgentState.updateStepStatus(taskId, agentStep.id, 'failed', undefined, errorMsg);
          throw error;
        }
      });
    }
    
    // Step 3: Final observation
    await step.run('final-observation', async () => {
      const observer = new AgentObserver();
      const screenshot = await observer.captureScreenshot();
      return screenshot;
    });
    
    // Mark task as completed
    AgentState.updatePlanStatus(taskId, 'completed');
    
    await inngest.send({
      name: EVENTS.TASK_COMPLETED,
      data: { taskId },
    });
    
    console.log(`[Inngest] Task completed: ${taskId}`);
    
    return { taskId, status: 'completed' };
  }
);

export const functions = [browserTaskFunction];
