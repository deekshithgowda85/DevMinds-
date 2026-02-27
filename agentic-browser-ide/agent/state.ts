// Agent State Manager - Manages task and step state
import 'dotenv/config';
import { AgentPlan, AgentStep, BrowserState } from '@/lib/types';

interface TaskData {
  plan: AgentPlan;
  screenshot?: string;
  browserState?: BrowserState;
}

const taskStore = new Map<string, TaskData>();

export class AgentState {
  static savePlan(plan: AgentPlan): void {
    const existing = taskStore.get(plan.taskId);
    taskStore.set(plan.taskId, {
      plan,
      screenshot: existing?.screenshot,
      browserState: existing?.browserState,
    });
  }

  static getPlan(taskId: string): AgentPlan | undefined {
    return taskStore.get(taskId)?.plan;
  }

  static getScreenshot(taskId: string): string | undefined {
    return taskStore.get(taskId)?.screenshot;
  }

  static getBrowserState(taskId: string): BrowserState | undefined {
    return taskStore.get(taskId)?.browserState;
  }

  static updateScreenshot(taskId: string, screenshot: string, browserState?: BrowserState): void {
    const existing = taskStore.get(taskId);
    if (!existing) return;
    
    taskStore.set(taskId, {
      ...existing,
      screenshot,
      browserState: browserState || existing.browserState,
    });
  }

  static updateStepStatus(
    taskId: string,
    stepId: string,
    status: AgentStep['status'],
    result?: string,
    error?: string
  ): void {
    const data = taskStore.get(taskId);
    if (!data) return;

    const step = data.plan.steps.find(s => s.id === stepId);
    if (step) {
      step.status = status;
      if (result) step.result = result;
      if (error) step.error = error;
    }

    taskStore.set(taskId, data);
  }

  static advanceStep(taskId: string): void {
    const data = taskStore.get(taskId);
    if (!data) return;

    data.plan.currentStepIndex++;
    data.plan.status = data.plan.currentStepIndex >= data.plan.steps.length ? 'completed' : 'executing';
    
    taskStore.set(taskId, data);
  }

  static updatePlanStatus(
    taskId: string,
    status: AgentPlan['status']
  ): void {
    const data = taskStore.get(taskId);
    if (!data) return;

    data.plan.status = status;
    taskStore.set(taskId, data);
  }

  static getCurrentStep(taskId: string): AgentStep | undefined {
    const data = taskStore.get(taskId);
    if (!data) return undefined;

    return data.plan.steps[data.plan.currentStepIndex];
  }

  static isCompleted(taskId: string): boolean {
    const data = taskStore.get(taskId);
    return data?.plan.status === 'completed' || data?.plan.status === 'failed';
  }
}
