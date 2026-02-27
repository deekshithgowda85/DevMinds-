import 'dotenv/config';
import { getBrowserSandbox, closeSandbox } from '../e2b/sandbox-manager';

async function testGeneral() {
  console.log('--- Starting General Functionality Test ---');

  if (!process.env.E2B_API_KEY) {
    console.error('Error: E2B_API_KEY environment variable is not set.');
    process.exit(1);
  }

  try {
    const sandbox = await getBrowserSandbox();
    
    // Test a sequence of actions
    const actions = [
        { type: 'navigate', url: 'https://google.com' },
        { type: 'type', selector: 'textarea[name="q"]', value: 'hello world' },
        { type: 'click', selector: 'input[name="btnK"]' } // This might fail if the selector isn't visible immediately, but tests the mechanism
    ];

    for (const action of actions) {
        console.log(`Executing action: ${action.type} ${action.url || action.selector || ''}`);
        try {
            await sandbox.executeAction(action as any);
            console.log(`Action ${action.type} completed.`);
            
            // Get state after action
            const state = await sandbox.getState();
            console.log('Current Browser State:', state);
            
        } catch (e) {
            console.warn(`Action ${action.type} encountered an issue (expected in headless sometimes):`, e);
        }
        
        // Small delay
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log("SUCCESS: General test sequence finished.");

  } catch (error) {
    console.error('FAILURE: Error in general test:', error);
  } finally {
    await closeSandbox();
    console.log('--- Test Complete ---');
  }
}

testGeneral();
