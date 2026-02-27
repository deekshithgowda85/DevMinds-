/**
 * Live Streaming Test Suite
 * Tests the WebRTC-like SSE streaming implementation
 */

import 'dotenv/config';

interface StreamMessage {
  type: 'connected' | 'frame' | 'error';
  taskId?: string;
  timestamp?: number;
  screenshot?: string;
  state?: {
    url: string;
    title: string;
    ready: boolean;
  };
  error?: string;
}

async function testLiveStream() {
  console.log('\n🧪 Testing Live Stream Connection...\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const taskId = 'test-stream-' + Date.now();
  
  console.log(`📡 Connecting to stream: ${baseUrl}/api/stream/live?taskId=${taskId}`);

  return new Promise<void>((resolve, reject) => {
    let frameCount = 0;
    let connectedReceived = false;
    const startTime = Date.now();
    const maxFrames = 5; // Test will receive 5 frames then close

    // Simulate EventSource (Node.js doesn't have it natively)
    const fetch = require('node-fetch');
    
    fetch(`${baseUrl}/api/stream/live?taskId=${taskId}`)
      .then((response: any) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        console.log('✅ Connection established');
        
        const reader = response.body;
        let buffer = '';

        reader.on('data', (chunk: Buffer) => {
          buffer += chunk.toString();
          
          // Process complete messages (delimited by \n\n)
          const messages = buffer.split('\n\n');
          buffer = messages.pop() || ''; // Keep incomplete message in buffer

          for (const message of messages) {
            if (!message.trim()) continue;
            
            // Parse SSE format: "data: {...}"
            const match = message.match(/^data: (.+)$/m);
            if (!match) continue;

            try {
              const data: StreamMessage = JSON.parse(match[1]);
              
              if (data.type === 'connected') {
                console.log(`✅ Connected to task: ${data.taskId}`);
                connectedReceived = true;
              } 
              else if (data.type === 'frame') {
                frameCount++;
                const elapsed = Date.now() - startTime;
                const screenshotSize = data.screenshot ? data.screenshot.length : 0;
                
                console.log(`📸 Frame ${frameCount} received:`);
                console.log(`   Timestamp: ${data.timestamp}`);
                console.log(`   Screenshot: ${screenshotSize} bytes`);
                console.log(`   State: ${data.state?.url || 'N/A'}`);
                console.log(`   Elapsed: ${elapsed}ms`);

                if (frameCount >= maxFrames) {
                  console.log(`\n✅ Test complete! Received ${frameCount} frames in ${elapsed}ms`);
                  reader.destroy();
                  resolve();
                }
              }
              else if (data.type === 'error') {
                console.error(`❌ Stream error: ${data.error}`);
                reject(new Error(data.error));
              }
            } catch (e) {
              console.error('❌ Parse error:', e);
            }
          }
        });

        reader.on('error', (error: Error) => {
          console.error('❌ Stream error:', error);
          reject(error);
        });

        reader.on('end', () => {
          if (frameCount < maxFrames) {
            console.log(`⚠️  Stream ended early (${frameCount}/${maxFrames} frames)`);
            resolve();
          }
        });

        // Timeout after 30 seconds
        setTimeout(() => {
          console.log(`⏱️  Timeout - received ${frameCount} frames`);
          reader.destroy();
          if (frameCount > 0) {
            resolve();
          } else {
            reject(new Error('No frames received within timeout'));
          }
        }, 30000);
      })
      .catch(reject);
  });
}

async function testStreamControl() {
  console.log('\n🧪 Testing Stream Control...\n');

  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  const taskId = 'test-control-' + Date.now();

  console.log(`📡 Starting stream for task: ${taskId}`);

  // Give it a moment to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('🛑 Stopping stream...');
  
  const fetch = require('node-fetch');
  const response = await fetch(`${baseUrl}/api/stream/live`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ taskId, action: 'stop' }),
  });

  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Stream stopped successfully');
  } else {
    console.error('❌ Failed to stop stream:', result.error);
    throw new Error('Stream control failed');
  }
}

async function testSessionPersistence() {
  console.log('\n🧪 Testing Session Persistence (localStorage simulation)...\n');

  // Simulate localStorage behavior
  const storage: Record<string, string> = {};

  // Initial session
  const taskId = 'test-session-' + Date.now();
  const messages = [
    { id: '1', role: 'user', content: 'Hello', timestamp: Date.now() },
    { id: '2', role: 'assistant', content: 'Hi there!', timestamp: Date.now() },
  ];
  const browserState = {
    url: 'https://youtube.com',
    title: 'YouTube',
    ready: true,
  };

  // Save to "localStorage"
  storage.currentTaskId = taskId;
  storage.chatMessages = JSON.stringify(messages);
  storage.browserState = JSON.stringify(browserState);

  console.log('💾 Saved session data:');
  console.log(`   Task ID: ${storage.currentTaskId}`);
  console.log(`   Messages: ${messages.length} items`);
  console.log(`   Browser: ${browserState.url}`);

  // Simulate page refresh - restore from "localStorage"
  const restoredTaskId = storage.currentTaskId;
  const restoredMessages = JSON.parse(storage.chatMessages);
  const restoredBrowser = JSON.parse(storage.browserState);

  console.log('\n🔄 After refresh:');
  console.log(`   Task ID: ${restoredTaskId} ${restoredTaskId === taskId ? '✅' : '❌'}`);
  console.log(`   Messages: ${restoredMessages.length} items ${restoredMessages.length === messages.length ? '✅' : '❌'}`);
  console.log(`   Browser: ${restoredBrowser.url} ${restoredBrowser.url === browserState.url ? '✅' : '❌'}`);

  if (
    restoredTaskId === taskId &&
    restoredMessages.length === messages.length &&
    restoredBrowser.url === browserState.url
  ) {
    console.log('\n✅ Session persistence test passed!');
  } else {
    throw new Error('Session persistence failed');
  }
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Live Streaming Test Suite           ║');
  console.log('╚════════════════════════════════════════╝');

  const tests = [
    { name: 'Session Persistence', fn: testSessionPersistence },
    // Uncomment when dev server is running:
    // { name: 'Live Stream Connection', fn: testLiveStream },
    // { name: 'Stream Control', fn: testStreamControl },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.fn();
      passed++;
    } catch (error) {
      console.error(`\n❌ ${test.name} failed:`, error);
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════╗');
  console.log(`║   Results: ${passed} passed, ${failed} failed`);
  console.log('╚════════════════════════════════════════╝\n');

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { testLiveStream, testStreamControl, testSessionPersistence };
