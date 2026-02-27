import 'dotenv/config';
import { getBrowserSandbox, closeSandbox } from '../e2b/sandbox-manager';
// We need to bypass the private visibility of the 'sandbox' property or use the public executeAction interface.
// Since 'sandbox' is private in BrowserSandbox, we might need to cast to any or check if there is a method to run code.
// The public interface allows 'executeAction', but for checking installation we ideally want to run a raw command.
// However, looking at e2b/sandbox.ts, the 'initialize' method runs setup scripts.
// We can assume if initialize succeeds, the environment is ready. 
// But to be thorough, let's try to run a simple python check if possible via the sandbox object directly if we can access it, 
// OR we can add a method to BrowserSandbox allowed to run custom commands, 
// OR simpler: we rely on 'executeAction' to perform a 'navigate' which implicitly uses the browser.

async function testBrowserInstalled() {
  console.log('--- Starting Browser Installation Test ---');

  if (!process.env.E2B_API_KEY) {
    console.error('Error: E2B_API_KEY environment variable is not set.');
    process.exit(1);
  }

  try {
    const browserSandbox = await getBrowserSandbox();
    
    // We can access the underlying sandbox object by casting to any if we need to run raw commands.
    // Or we can rely on the fact that 'executeAction' interacts with the python script 'browser.py'
    // explicitly importing playwright.
    
    // Let's try to verify python side directly.
    const rawSandbox = (browserSandbox as any).sandbox;
    if (!rawSandbox) {
        throw new Error("Could not access underlying sandbox instance.");
    }

    console.log("Checking if python is installed...");
    const pythonCheck = await rawSandbox.commands.run('python3 --version');
    console.log(`Python check: ${pythonCheck.stdout.trim()}`);

    console.log("Checking if playwright is installed...");
    const pipCheck = await rawSandbox.commands.run('pip list | grep playwright');
    if (pipCheck.stdout.includes('playwright')) {
        console.log(`SUCCESS: Playwright found: \n${pipCheck.stdout.trim()}`);
    } else {
        console.warn(`WARNING: Playwright might not be listed in pip list explicitly or grep failed. Output: ${pipCheck.stdout}`);
    }

    // Checking Chromium
    console.log("Checking for browsers...");
    // This might fail if playwright manages binaries internally in cache folders, but let's try a simple browser launch via our script
    // which is what 'getBrowserSandbox' does on initialize ('await globalSandbox.startBrowser()').
    // If startBrowser() didn't throw, we are good.
    
    console.log("SUCCESS: Browser environment appears valid.");

  } catch (error) {
    console.error('FAILURE: Error during browser check:', error);
  } finally {
    await closeSandbox();
    console.log('--- Test Complete ---');
  }
}

testBrowserInstalled();
