// Agent Executor - Executes browser actions
import 'dotenv/config';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';
import { AgentStep } from '@/lib/types';

export class AgentExecutor {
  async executeStep(step: AgentStep): Promise<string> {
    console.log(`[Executor] Executing: ${step.description}`);
    
    try {
      const sandbox = await getBrowserSandbox();
      const result = await sandbox.executeAction(step.action);
      
      // Log result summary (avoid logging huge screenshots)
      if (result.output && result.output.length > 200) {
        console.log(`[Executor] Success: { success: ${result.success}, output: ${result.output.substring(0, 50)}... (${result.output.length} bytes) }`);
      } else {
        console.log(`[Executor] Success:`, result);
      }
      return JSON.stringify(result);
    } catch (error) {
      console.error(`[Executor] Failed:`, error);
      throw error;
    }
  }

  async retry(step: AgentStep, maxRetries: number = 3): Promise<string> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[Executor] Attempt ${attempt}/${maxRetries}`);
        return await this.executeStep(step);
      } catch (error) {
        lastError = error as Error;
        console.warn(`[Executor] Retry ${attempt} failed:`, error);
        
        if (attempt < maxRetries) {
          await this.wait(1000 * attempt); // Exponential backoff
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded');
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
