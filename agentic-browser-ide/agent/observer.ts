// Agent Observer - Observes browser state and extracts information
import 'dotenv/config';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';
import { BrowserState } from '@/lib/types';

export class AgentObserver {
  async observe(): Promise<BrowserState> {
    console.log('[Observer] Observing browser state...');
    
    try {
      const sandbox = await getBrowserSandbox();
      const state = await sandbox.getState();
      
      console.log('[Observer] State:', state);
      return state;
    } catch (error) {
      console.error('[Observer] Failed:', error);
      return { url: '', title: '', ready: false };
    }
  }

  async captureScreenshot(): Promise<string> {
    console.log('[Observer] Capturing screenshot...');
    
    try {
      const sandbox = await getBrowserSandbox();
      
      // Always execute a fresh screenshot action instead of reading cache
      const action = {
        id: Date.now().toString(),
        type: 'screenshot' as const,
        timestamp: Date.now(),
      };
      
      const result = await sandbox.executeAction(action);
      
      if (result.success && result.output && result.output.length > 100) {
        console.log('[Observer] Fresh screenshot captured:', result.output.length, 'bytes');
        return result.output;
      }
      
      console.warn('[Observer] Screenshot action returned invalid data');
      return '';
    } catch (error) {
      console.error('[Observer] Screenshot failed:', error);
      return '';
    }
  }

  async checkSuccess(expectedResult?: string): Promise<boolean> {
    const state = await this.observe();
    
    if (!state.ready) {
      return false;
    }
    
    if (expectedResult) {
      // Check if expected result is in title or URL
      return state.title.includes(expectedResult) || state.url.includes(expectedResult);
    }
    
    return true;
  }
}
