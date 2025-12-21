import { NextRequest } from 'next/server';
import { getSandboxInstance } from '@/lib/sandbox-instances';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sessionId = searchParams.get('sessionId');

  if (!sessionId) {
    return new Response('Missing sessionId', { status: 400 });
  }

  const sandbox = getSandboxInstance(sessionId);
  if (!sandbox) {
    return new Response('Sandbox not found', { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const terminal = sandbox.getTerminalSession();
      
      if (!terminal) {
        controller.enqueue(encoder.encode('data: {"error": "Terminal not started"}\n\n'));
        controller.close();
        return;
      }

      // Set up terminal data listener
      const dataHandler = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'data', data })}\n\n`));
      };

      const exitHandler = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'exit' })}\n\n`));
        controller.close();
      };

      // Store original handlers
      const originalOnData = terminal.onData;
      const originalOnExit = terminal.onExit;

      // Wrap handlers to broadcast to SSE
      terminal.onData = (data: string) => {
        dataHandler(data);
        if (originalOnData) originalOnData(data);
      };

      terminal.onExit = () => {
        exitHandler();
        if (originalOnExit) originalOnExit();
      };

      // Send initial connected message
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch (e) {
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        terminal.onData = originalOnData;
        terminal.onExit = originalOnExit;
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
