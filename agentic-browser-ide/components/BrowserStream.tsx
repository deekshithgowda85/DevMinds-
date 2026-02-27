'use client';

import { useEffect, useState, useRef } from 'react';
import { BrowserState } from '@/lib/types';

interface BrowserStreamProps {
  browserState: BrowserState;
  screenshot: string;
  onRefresh?: () => void;
}

export default function BrowserStream({ browserState, screenshot, onRefresh }: BrowserStreamProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [lastFrameTime, setLastFrameTime] = useState<number>(0);
  const [frameCount, setFrameCount] = useState<number>(0);

  // Connect to live stream via Server-Sent Events  
  useEffect(() => {
    const taskId = localStorage.getItem('currentTaskId');
    
    if (!taskId) {
      console.warn('[BrowserStream] ⚠️ No taskId found, waiting...');
      const retryTimeout = setTimeout(() => {
        window.location.reload();
      }, 2000);
      return () => clearTimeout(retryTimeout);
    }
    
    console.log('[BrowserStream] 🔌 Connecting to SSE stream for task:', taskId);
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(`/api/stream/live?taskId=${taskId}`);
      
      eventSource.onopen = () => {
        console.log('[BrowserStream] ✅ SSE connection opened');
        setIsStreaming(true);
      };

      eventSource.onmessage = (event) => {
        console.log('[BrowserStream] 📨 SSE message received, length:', event.data.length);
        console.log('[BrowserStream] 📨 Raw data preview:', event.data.substring(0, 150));
        
        try {
          const data = JSON.parse(event.data);
          console.log('[BrowserStream] 📦 Parsed data type:', data.type);
          console.log('[BrowserStream] 📦 Full data:', data);
          
          if (data.type === 'frame' && data.screenshot) {
            console.log('[BrowserStream] 🖼️ Frame received:', data.screenshot.length, 'bytes');
            
            const canvas = canvasRef.current;
            if (!canvas) {
              console.error('[BrowserStream] ❌ Canvas ref is null!');
              console.error('[BrowserStream] ❌ Canvas element:', document.querySelector('canvas'));
              return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('[BrowserStream] ❌ No canvas context');
              return;
            }

            const img = new Image();
            img.onload = () => {
              ctx.clearRect(0, 0, 1280, 720);
              ctx.drawImage(img, 0, 0, 1280, 720);
              setIsLoading(false);
              setLastFrameTime(Date.now());
              setFrameCount(prev => prev + 1);
              console.log('[BrowserStream] ✅ Frame #' + (frameCount + 1) + ' rendered to canvas');
            };
            img.onerror = (e) => {
              console.error('[BrowserStream] ❌ Image load error:', e);
            };
            img.src = `data:image/png;base64,${data.screenshot}`;
          } else if (data.type === 'connected') {
            console.log('[BrowserStream] ✅ Stream session confirmed:', data.taskId);
          } else if (data.type === 'error') {
            console.error('[BrowserStream] ❌ Stream error:', data.error);
          }
        } catch (error) {
          console.error('[BrowserStream] ❌ Failed to parse stream data:', error);
          console.error('[BrowserStream] Raw data:', event.data.substring(0, 200));
        }
      };

      eventSource.onerror = (error) => {
        console.error('[BrowserStream] ❌ SSE error:', error);
        console.error('[BrowserStream] ReadyState:', eventSource?.readyState);
        setIsStreaming(false);
      };
    } catch (error) {
      console.error('[BrowserStream] ❌ Failed to create EventSource:', error);
    }

    return () => {
      console.log('[BrowserStream] 🔌 Closing SSE connection');
      if (eventSource) {
        eventSource.close();
      }
      setIsStreaming(false);
    };
  }, []);

  // Log canvas ref status
  useEffect(() => {
    if (canvasRef.current) {
      console.log('[BrowserStream] ✅ Canvas ref is ready!', canvasRef.current);
    } else {
      console.log('[BrowserStream] ⏳ Canvas ref not yet available');
    }
  }, [canvasRef.current]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Browser Controls */}
      <div className="bg-gray-900 border-b border-gray-700 p-3">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          
          <div className="flex-1 bg-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <span className="text-gray-500 text-sm">🔒</span>
            <span className="text-gray-300 text-sm truncate">
              {browserState.url || 'about:blank'}
            </span>
          </div>

          <button
            onClick={onRefresh}
            className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm transition-colors"
            title="Refresh page"
          >
            ↻ Refresh
          </button>

          <div className={`px-3 py-1 rounded-full text-xs ${
            browserState.ready 
              ? 'bg-green-500/20 text-green-400' 
              : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {browserState.ready ? 'Ready' : 'Initializing...'}
          </div>

          <div className={`px-3 py-1 rounded-full text-xs ${
            isStreaming 
              ? 'bg-red-500/20 text-red-400 animate-pulse' 
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {isStreaming ? '● LIVE' : '○ Offline'}
          </div>
        </div>

        {browserState.title && (
          <div className="mt-2 text-sm text-gray-400 truncate">
            {browserState.title}
          </div>
        )}
      </div>

      {/* Browser View - CANVAS ALWAYS RENDERED */}
      <div className="flex-1 relative bg-gray-900 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width="1280"
          height="720"
          className="max-w-full max-h-full object-contain"
          style={{ 
            imageRendering: 'crisp-edges',
            backgroundColor: '#1a1a1a',
            border: isStreaming ? '2px solid #10b981' : '2px solid #374151'
          }}
        />
        
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-gray-400 text-center bg-gray-900/90 p-6 rounded-lg border border-gray-700">
              <div className="text-4xl mb-3">🌐</div>
              <div className="text-lg font-medium mb-2">
                {isStreaming ? 'Waiting for frames...' : 'Connecting...'}
              </div>
              <div className="text-sm text-gray-500">
                Frames received: {frameCount}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Last frame: {lastFrameTime ? new Date(lastFrameTime).toLocaleTimeString() : 'Never'}
              </div>
              {isStreaming && (
                <div className="mt-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 border-t border-gray-700 px-4 py-2 text-xs text-gray-400">
        Agentic Browser IDE • Live Browser Stream • Frames: {frameCount}
      </div>
    </div>
  );
}
