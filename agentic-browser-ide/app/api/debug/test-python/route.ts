// Test Python execution directly
import { NextResponse } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';

export async function GET() {
  const results: any = {};
  
  try {
    const sandbox = await getBrowserSandbox();
    const sandboxInstance = (sandbox as any).sandbox;
    
    if (!sandboxInstance) {
      return NextResponse.json({ error: 'No sandbox' }, { status: 500 });
    }
    
    // Test 1: Simple Python script
    try {
      const testScript = `print("Hello from Python")
import sys
print("Python version:", sys.version)
`;
      
      await sandboxInstance.files.write('/home/user/test.py', testScript);
      const proc1 = await sandboxInstance.commands.run('python3 /home/user/test.py 2>&1');
      results.test1_simple_python = {
        stdout: proc1.stdout,
        stderr: proc1.stderr,
        exitCode: proc1.exitCode,
      };
    } catch (e) {
      results.test1_simple_python = { error: String(e) };
    }
    
    // Test 2: Playwright import
    try {
      const playwrightTest = `try:
    from playwright.sync_api import sync_playwright
    print("Playwright imported successfully")
except Exception as e:
    print("Playwright import failed:", str(e))
    import traceback
    traceback.print_exc()
`;
      
      await sandboxInstance.files.write('/home/user/test_playwright.py', playwrightTest);
      const proc2 = await sandboxInstance.commands.run('python3 /home/user/test_playwright.py 2>&1');
      results.test2_playwright_import = {
        stdout: proc2.stdout,
        stderr: proc2.stderr,
        exitCode: proc2.exitCode,
      };
    } catch (e) {
      results.test2_playwright_import = { error: String(e) };
    }
    
    // Test 3: Launch browser
    try {
      const browserTest = `from playwright.sync_api import sync_playwright
import sys

try:
    with sync_playwright() as p:
        print("Starting browser...", file=sys.stderr)
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        print("Browser launched", file=sys.stderr)
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        print("Page created", file=sys.stderr)
        page.goto('https://example.com', wait_until='networkidle', timeout=30000)
        print("Navigation complete", file=sys.stderr)
        print("SUCCESS")
        browser.close()
except Exception as e:
    print(f"Browser test failed: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;
      
      await sandboxInstance.files.write('/home/user/test_browser.py', browserTest);
      const proc3 = await sandboxInstance.commands.run('python3 /home/user/test_browser.py 2>&1');
      results.test3_browser_launch = {
        stdout: proc3.stdout,
        stderr: proc3.stderr,
        exitCode: proc3.exitCode,
      };
    } catch (e) {
      results.test3_browser_launch = { error: String(e) };
    }
    
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        partialResults: results,
      },
      { status: 500 }
    );
  }
}
