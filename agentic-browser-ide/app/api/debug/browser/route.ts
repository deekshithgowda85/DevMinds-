// Debug API - Direct browser test
import { NextRequest, NextResponse } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';
import { BrowserAction } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    
    console.log(`[Debug] Testing browser with URL: ${url}`);
    
    const sandbox = await getBrowserSandbox();
    
    // Navigate
    const navigateAction: BrowserAction = {
      id: '1',
      type: 'navigate',
      url: url || 'https://youtube.com',
      timestamp: Date.now(),
    };
    
    const result = await sandbox.executeAction(navigateAction);
    console.log('[Debug] Navigate result:', result);
    
    // Get screenshot
    const screenshot = await sandbox.getScreenshot();
    console.log('[Debug] Screenshot length:', screenshot.length);
    
    // Get state
    const state = await sandbox.getState();
    console.log('[Debug] State:', state);
    
    return NextResponse.json({
      success: true,
      result,
      screenshot: screenshot.substring(0, 100) + '...',
      screenshotLength: screenshot.length,
      state,
      fullScreenshot: screenshot, // Include full screenshot for testing
    });
  } catch (error) {
    console.error('[Debug] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sandbox = await getBrowserSandbox();
    const state = await sandbox.getState();
    
    return NextResponse.json({
      success: true,
      sandboxId: sandbox.getSandboxId(),
      state,
    });
  } catch (error) {
    console.error('[Debug] Failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
