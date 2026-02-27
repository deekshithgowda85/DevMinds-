import 'dotenv/config';
import { getBrowserSandbox, closeSandbox } from '../e2b/sandbox-manager';

async function testConnection() {
  console.log('--- Starting Sandbox Connection Test ---');

  if (!process.env.E2B_API_KEY) {
    console.error('Error: E2B_API_KEY environment variable is not set.');
    process.exit(1);
  }

  try {
    console.log('Initializing sandbox...');
    const sandbox = await getBrowserSandbox();
    const sandboxId = sandbox.getSandboxId();

    if (sandboxId) {
      console.log(`SUCCESS: Sandbox connected! ID: ${sandboxId}`);
    } else {
      console.error('FAILURE: Sandbox initialized but no ID returned.');
    }
  } catch (error) {
    console.error('FAILURE: Error connecting to sandbox:', error);
  } finally {
    console.log('Cleaning up...');
    await closeSandbox();
    console.log('--- Test Complete ---');
  }
}

testConnection();
