// Debug endpoint to check Python script generation
import { NextResponse } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';

export async function GET() {
  try {
    const sandbox = await getBrowserSandbox();
    const sandboxInstance = (sandbox as any).sandbox;
    
    if (!sandboxInstance) {
      return NextResponse.json({ error: 'No sandbox' }, { status: 500 });
    }
    
    // Read the actual script file if it exists
    try {
      const scriptContent = await sandboxInstance.files.read('/home/user/capture_screenshot.py');
      
      // Also check if screenshot file exists
      let screenshotExists = false;
      try {
        await sandboxInstance.files.read('/home/user/screenshot.b64');
        screenshotExists = true;
      } catch {
        screenshotExists = false;
      }
      
      return NextResponse.json({
        scriptContent,
        screenshotExists,
        currentUrl: (sandbox as any).currentUrl,
      });
    } catch (error) {
      return NextResponse.json({
        error: 'Script file not found',
        message: error instanceof Error ? error.message : 'Unknown',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
