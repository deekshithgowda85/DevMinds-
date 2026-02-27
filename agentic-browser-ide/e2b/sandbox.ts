// E2B Sandbox Manager for Browser Control
import 'dotenv/config';
import { Sandbox } from 'e2b';
import { BrowserAction, BrowserState } from '@/lib/types';

export class BrowserSandbox {
  private sandbox: Sandbox | null = null;
  private sandboxId: string | null = null;
  private currentUrl: string = 'about:blank';
  private currentTitle: string = 'Browser';

  async initialize(): Promise<string> {
    console.log('[E2B] Initializing sandbox...');
    
    this.sandbox = await Sandbox.create('lrvnyvbiyun27b6ppmj4', {
      apiKey: process.env.E2B_API_KEY,
      timeoutMs: 30 * 60 * 1000, // 30 minutes
    });
    
    this.sandboxId = (this.sandbox as any).sandboxId || (this.sandbox as any).id;
    console.log(`[E2B] Sandbox created: ${this.sandboxId}`);
    
    // Create persistent browser script
    const browserScript = `
import asyncio
from playwright.async_api import async_playwright
import base64
import json
import sys

class PersistentBrowser:
    def __init__(self):
        self.browser = None
        self.page = None
        
    async def start(self):
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        self.page = await self.browser.new_page(viewport={'width': 1280, 'height': 720})
        await self.page.goto('about:blank')
        
    async def screenshot(self):
        if self.page:
            screenshot = await self.page.screenshot()
            return base64.b64encode(screenshot).decode()
        return ''
        
    async def get_state(self):
        if self.page:
            return {
                'url': self.page.url,
                'title': await self.page.title()
            }
        return {'url': '', 'title': ''}
`;
    
    await this.sandbox.files.write('/home/user/browser.py', browserScript);
    console.log('[E2B] Persistent browser script created');
    
    // Install Playwright browsers if not already installed
    console.log('[E2B] Ensuring Playwright browsers are installed...');
    const installResult = await this.sandbox.commands.run('playwright install chromium --with-deps');
    if (installResult.exitCode !== 0) {
      console.warn('[E2B] Browser installation warning:', installResult.stderr);
    } else {
      console.log('[E2B] Browsers verified/installed successfully');
    }
    
    return this.sandboxId!
  }

  async startBrowser(): Promise<void> {
    console.log('[E2B] Browser module initialized');
    // Browser will be launched on-demand for each action
  }

  async executeAction(action: BrowserAction): Promise<{ success: boolean; output?: string; error?: string }> {
    if (!this.sandbox) {
      throw new Error('Sandbox not initialized');
    }
    
    console.log(`[E2B] Executing action: ${action.type}`);
    
    let script = '';
    
    switch (action.type) {
      case 'navigate':
        this.currentUrl = action.url || 'about:blank';
        script = this.generateNavigateScript(action.url || '');
        break;
        
      case 'click':
        script = this.generateClickScript(action.selector || '');
        break;
        
      case 'type':
        script = this.generateTypeScript(action.selector || '', action.value || '');
        break;
        
      case 'submit':
        script = this.generateSubmitScript(action.selector || '');
        break;
        
      case 'scroll':
        script = this.generateScrollScript(action.value || '500');
        break;
        
      case 'wait':
        const ms = parseInt(action.value || '2000');
        await new Promise(resolve => setTimeout(resolve, ms));
        return { success: true, output: `Waited ${ms}ms` };
        
      case 'screenshot':
        script = this.generateScreenshotScript();
        break;
        
      default:
        throw new Error(`Unsupported action type: ${action.type}`);
    }
    
    if (script) {
      try {
        // Write script to a file instead of passing via -c
        const scriptPath = `/home/user/browser_action.py`;
        await this.sandbox.files.write(scriptPath, script);
        
        const proc = await this.sandbox.commands.run(
          `python3 ${scriptPath}`
        );
        
        const stdout = proc.stdout;
        const stderr = proc.stderr;
        
        console.log('[E2B] Script stdout length:', stdout.length);
        if (stderr) console.log('[E2B] Script stderr:', stderr);
        console.log('[E2B] Script exit code:', proc.exitCode);
        
        if (proc.exitCode !== 0 || stderr) {
          console.error('[E2B] Action failed - stderr:', stderr);
          console.error('[E2B] Action failed - stdout:', stdout);
          console.error('[E2B] Script path:', scriptPath);
          return { success: false, error: stderr || 'Script failed', output: stdout };
        }
        
        // For screenshot action, return the base64 data directly
        if (action.type === 'screenshot') {
          const cleanOutput = stdout.trim();
          if (cleanOutput.length > 100) {
            console.log('[E2B] Screenshot action completed:', cleanOutput.length, 'bytes');
            return { success: true, output: cleanOutput };
          }
        }
        
        // Extract screenshot from output if present
        let screenshotData = '';
        if (stdout.includes('SCREENSHOT:')) {
          const screenshotMatch = stdout.match(/SCREENSHOT: ([A-Za-z0-9+/=]+)/);  // Removed /s flag for ES5 compatibility
          if (screenshotMatch) {
            screenshotData = screenshotMatch[1];
            console.log('[E2B] Screenshot extracted:', screenshotData.length, 'bytes');
            
            // Save to file for later retrieval
            try {
              await this.sandbox.files.write('/home/user/screenshot.b64', screenshotData);
              console.log('[E2B] Screenshot saved');
            } catch (e) {
              console.error('[E2B] Failed to save screenshot:', e);
            }
          }
        }
        
        // Update state from output
        this.updateStateFromOutput(stdout);
        
        console.log('[E2B] Action completed:', action.type);
        return { success: true, output: stdout };
      } catch (error) {
        console.error('[E2B] Execution error:', error);
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    return { success: false, error: 'No script generated' };
  }

  private generateNavigateScript(url: string): string {
    return `from playwright.sync_api import sync_playwright
import base64
import sys

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('${url}', wait_until='networkidle', timeout=30000)
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        with open('/home/user/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
        print("SCREENSHOT:", screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;
  }

  private generateClickScript(selector: string): string {
    return `
from playwright.sync_api import sync_playwright
import base64
import sys
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('${this.currentUrl}', wait_until='networkidle', timeout=30000)
        page.wait_for_selector('${selector}', timeout=10000)
        page.click('${selector}')
        page.wait_for_load_state('networkidle', timeout=10000)
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        with open('/home/user/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
        print("SCREENSHOT:", screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }

  private generateTypeScript(selector: string, value: string): string {
    const escapedValue = value.replace(/'/g, "\\'").replace(/"/g, '\\"');
    return `
from playwright.sync_api import sync_playwright
import base64
import sys
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('${this.currentUrl}', wait_until='networkidle', timeout=30000)
        page.wait_for_selector('${selector}', timeout=10000)
        page.fill('${selector}', '''${escapedValue}''')
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        with open('/tmp/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
        print("SCREENSHOT:", screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }

  private generateSubmitScript(selector: string): string {
    return `
from playwright.sync_api import sync_playwright
import base64
import sys
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('${this.currentUrl}', wait_until='networkidle', timeout=30000)
        page.wait_for_selector('${selector}', timeout=10000)
        page.press('${selector}', 'Enter')
        page.wait_for_load_state('networkidle', timeout=10000)
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        with open('/home/user/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
        print("SCREENSHOT:", screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
  }

  private generateScrollScript(pixels: string): string {
    return `
from playwright.sync_api import sync_playwright
import base64
import sys
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        page.goto('${this.currentUrl}', wait_until='networkidle', timeout=30000)
        page.evaluate('window.scrollBy(0, ${pixels})')
        page.wait_for_timeout(500)
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        with open('/home/user/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
        print("SCREENSHOT:", screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;
  }

  private generateScreenshotScript(): string {
    const targetUrl = this.currentUrl || 'about:blank';
    return `from playwright.sync_api import sync_playwright
import base64
import sys

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-setuid-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        
        # Navigate to current URL or use about:blank
        target_url = '${targetUrl}'
        if target_url and target_url != 'about:blank':
            page.goto(target_url, wait_until='networkidle', timeout=30000)
        
        # Take screenshot
        screenshot = page.screenshot(full_page=False)
        screenshot_b64 = base64.b64encode(screenshot).decode()
        
        # Print only the base64 data (no prefix)
        print(screenshot_b64)
        browser.close()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    import traceback
    traceback.print_exc()
    sys.exit(1)
`;
  }

  private updateStateFromOutput(output: string): void {
    if (output && output.includes('Title:')) {
      const titleMatch = output.match(/Title: (.+)/);
      if (titleMatch) this.currentTitle = titleMatch[1];
    }
    
    if (output && output.includes('URL:')) {
      const urlMatch = output.match(/URL: (.+)/);
      if (urlMatch) this.currentUrl = urlMatch[1];
    }
  }

  async getState(): Promise<BrowserState> {
    return {
      url: this.currentUrl,
      title: this.currentTitle,
      ready: this.sandbox !== null,
    };
  }

    async getScreenshot(): Promise<string> {
    if (!this.sandbox) {
      console.log('[E2B] No sandbox available');
      return '';
    }
    
    try {
      // Always capture fresh screenshot instead of reading cached file
      console.log('[E2B] Capturing fresh screenshot...');
      throw new Error('Force fresh capture');
    } catch (error) {
      console.log('[E2B] Screenshot file not found, capturing new one...');
      
      // Fallback: capture new screenshot with simpler inline script
      try {
        const simpleScript = `import base64
import sys
from playwright.sync_api import sync_playwright

try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        page = browser.new_page(viewport={'width': 1280, 'height': 720})
        
        target_url = '${this.currentUrl}' 
        if target_url and target_url != 'about:blank':
            page.goto(target_url, wait_until='networkidle', timeout=30000)
            
        screenshot = page.screenshot()
        screenshot_b64 = base64.b64encode(screenshot).decode()
        
        with open('/home/user/screenshot.b64', 'w') as f:
            f.write(screenshot_b64)
            
        print(screenshot_b64)
        browser.close()
except Exception as e:
    import traceback
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
`;
        
        await this.sandbox.files.write('/home/user/capture_screenshot.py', simpleScript);
        const proc = await this.sandbox.commands.run('python3 /home/user/capture_screenshot.py');
        
        console.log('[E2B] Screenshot captured (', proc.stdout.length, 'bytes)');
        if (proc.stderr) console.log('[E2B] Capture stderr:', proc.stderr);
        if (proc.exitCode !== 0) console.log('[E2B] Exit code:', proc.exitCode);
        
        if (proc.exitCode === 0 && proc.stdout) {
          return proc.stdout.trim();
        }
        
        console.error('[E2B] Screenshot capture failed with code', proc.exitCode);
        if (proc.stderr) console.error('[E2B] Stderr:', proc.stderr.substring(0, 500));
        console.error('[E2B] Stdout length:', proc.stdout.length);
        return '';
      } catch (captureError) {
        console.error('[E2B] Screenshot capture error:', captureError);
        return '';
      }
    }
  }

getSandboxId(): string | null {
    return this.sandboxId;
  }

  async close(): Promise<void> {
    if (this.sandbox) {
      console.log(`[E2B] Closing sandbox: ${this.sandboxId}`);
      await this.sandbox.kill();
      this.sandbox = null;
      this.sandboxId = null;
    }
  }
}

// Singleton
let globalSandbox: BrowserSandbox | null = null;

export async function getBrowserSandbox(): Promise<BrowserSandbox> {
  if (!globalSandbox) {
    globalSandbox = new BrowserSandbox();
    await globalSandbox.initialize();
    await globalSandbox.startBrowser();
  }
  return globalSandbox;
}

export async function closeSandbox(): Promise<void> {
  if (globalSandbox) {
    await globalSandbox.close();
    globalSandbox = null;
  }
}
