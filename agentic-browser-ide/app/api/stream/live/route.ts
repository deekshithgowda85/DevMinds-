// WebRTC Streaming Server-Side Handler
import { NextRequest } from 'next/server';
import { getBrowserSandbox } from '@/e2b/sandbox-manager';
import type { BrowserSandbox } from '@/e2b/sandbox';

// Store active streams
const activeStreams = new Map<string, NodeJS.Timeout>();

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get('taskId') || 'default';

  console.log(`[WebRTC Stream] Client connecting for task ${taskId}`);

  // Create a readable stream
  const encoder = new TextEncoder();
  let isConnected = true;
  let sandbox: BrowserSandbox | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[WebRTC Stream] 🎬 Stream started for ${taskId}`);

      try {
        // Get sandbox ONCE at the start - CRITICAL for avoiding rate limits!
        console.log(`[WebRTC Stream] Getting sandbox for task: ${taskId}`);
        sandbox = await getBrowserSandbox(taskId);
        console.log(`[WebRTC Stream] ✅ Sandbox acquired (will be reused for entire stream)`);
        
        // Navigate to YouTube to ensure we have content to stream
        console.log('[WebRTC Stream] 🎬 Navigating to YouTube...');
        await sandbox.executeAction({
          id: 'initial-nav-' + Date.now(),
          type: 'navigate',
          url: 'https://youtube.com',
          timestamp: Date.now(),
        });
        console.log('[WebRTC Stream] ✅ YouTube loaded');
      } catch (error) {
        console.error('[WebRTC Stream] ❌ Failed to get sandbox:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Failed to initialize sandbox: ' + String(error) })}\n\n`));
        controller.close();
        return;
      }

      // Send initial connection message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected', taskId })}\n\n`));

      // Start continuous screenshot capture
      const captureInterval = setInterval(async () => {
        if (!isConnected || !sandbox) {
          clearInterval(captureInterval);
          return;
        }

        try {
          const state = await sandbox.getState();
          
          // Execute screenshot action
          const screenshotAction = {
            id: Date.now().toString(),
            type: 'screenshot' as const,
            timestamp: Date.now(),
          };

          const result = await sandbox.executeAction(screenshotAction);

          if (result.success && result.output && result.output.length > 100) {
            const frame = {
              type: 'frame',
              timestamp: Date.now(),
              screenshot: result.output,
              state: {
                url: state.url,
                title: state.title,
                ready: state.ready,
              },
            };

            const frameData = `data: ${JSON.stringify(frame)}\n\n`;
            controller.enqueue(encoder.encode(frameData));
            console.log(`[WebRTC Stream] 📸 Frame sent (${result.output.length} bytes) to task ${taskId}`);
          } else {
            console.warn(`[WebRTC Stream] ⚠️ Screenshot too small or failed: ${result.output?.length || 0} bytes`);
          }
        } catch (error) {
          console.error('[WebRTC Stream] ❌ Capture error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: String(error) })}\n\n`));
        }
      }, 2000); // 2 second interval to reduce CPU usage

      // Store interval and prevent duplicates
      const existingInterval = activeStreams.get(taskId);
      if (existingInterval) {
        console.log(`[WebRTC Stream] ⚠️ Clearing existing interval for ${taskId}`);
        clearInterval(existingInterval);
      }
      activeStreams.set(taskId, captureInterval);

      // Cleanup on abort
      request.signal.addEventListener('abort', () => {
        console.log(`[WebRTC Stream] Client disconnected for ${taskId}`);
        isConnected = false;
        const interval = activeStreams.get(taskId);
        if (interval) {
          clearInterval(interval);
        }
        activeStreams.delete(taskId);
        sandbox = null;
      });
    },

    cancel() {
      console.log(`[WebRTC Stream] Stream cancelled for ${taskId}`);
      isConnected = false;
      const interval = activeStreams.get(taskId);
      if (interval) {
        clearInterval(interval);
      }
      activeStreams.delete(taskId);
      sandbox = null;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { taskId, action } = await request.json();

    if (action === 'stop') {
      const interval = activeStreams.get(taskId);
      if (interval) {
        clearInterval(interval);
        activeStreams.delete(taskId);
        console.log(`[WebRTC Stream] Stopped stream for ${taskId}`);
      }
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
