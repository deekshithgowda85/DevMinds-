#!/usr/bin/env python3
"""
Browser control script running inside E2B sandbox
Handles Playwright browser automation and screen capture
"""
import json
import sys
from playwright.sync_api import sync_playwright, Page, Browser
import base64
import time

class BrowserController:
    def __init__(self):
        self.playwright = None
        self.browser = None
        self.page = None
        self.context = None
        
    def start(self):
        """Initialize browser"""
        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-dev-shm-usage']
        )
        self.context = self.browser.new_context(
            viewport={'width': 1280, 'height': 720},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        )
        self.page = self.context.new_page()
        return {"status": "ready"}
    
    def navigate(self, url):
        """Navigate to URL"""
        if not self.page:
            raise Exception("Browser not initialized")
        self.page.goto(url, wait_until='networkidle', timeout=30000)
        return {
            "url": self.page.url,
            "title": self.page.title()
        }
    
    def click(self, selector):
        """Click element"""
        if not self.page:
            raise Exception("Browser not initialized")
        self.page.click(selector, timeout=10000)
        return {"clicked": selector}
    
    def type_text(self, selector, text):
        """Type text into element"""
        if not self.page:
            raise Exception("Browser not initialized")
        self.page.fill(selector, text, timeout=10000)
        return {"typed": text, "into": selector}
    
    def scroll(self, pixels=500):
        """Scroll page"""
        if not self.page:
            raise Exception("Browser not initialized")
        self.page.evaluate(f"window.scrollBy(0, {pixels})")
        return {"scrolled": pixels}
    
    def screenshot(self):
        """Capture screenshot"""
        if not self.page:
            raise Exception("Browser not initialized")
        screenshot_bytes = self.page.screenshot(full_page=False)
        screenshot_base64 = base64.b64encode(screenshot_bytes).decode('utf-8')
        return {"screenshot": screenshot_base64}
    
    def get_state(self):
        """Get current browser state"""
        if not self.page:
            return {"ready": False}
        return {
            "ready": True,
            "url": self.page.url,
            "title": self.page.title()
        }
    
    def close(self):
        """Close browser"""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        return {"status": "closed"}

def handle_command(controller, command):
    """Handle incoming command"""
    action = command.get('action')
    
    if action == 'start':
        return controller.start()
    elif action == 'navigate':
        return controller.navigate(command['url'])
    elif action == 'click':
        return controller.click(command['selector'])
    elif action == 'type':
        return controller.type_text(command['selector'], command['text'])
    elif action == 'scroll':
        return controller.scroll(command.get('pixels', 500))
    elif action == 'screenshot':
        return controller.screenshot()
    elif action == 'state':
        return controller.get_state()
    elif action == 'close':
        return controller.close()
    else:
        raise Exception(f"Unknown action: {action}")

if __name__ == "__main__":
    controller = BrowserController()
    
    # Read commands from stdin
    for line in sys.stdin:
        try:
            command = json.loads(line.strip())
            result = handle_command(controller, command)
            print(json.dumps({"success": True, "result": result}))
            sys.stdout.flush()
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.stdout.flush()
