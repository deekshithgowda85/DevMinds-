'use client';

import { useState, useEffect } from 'react';
import ChatPanel from '@/components/ChatPanel';
import BrowserStream from '@/components/BrowserStream';
import { ChatMessage, BrowserState } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [browserState, setBrowserState] = useState<BrowserState>({
    url: '',
    title: '',
    ready: false,
  });
  const [screenshot, setScreenshot] = useState<string>('');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Load session from localStorage on mount
  useEffect(() => {
    const savedTaskId = localStorage.getItem('currentTaskId');
    const savedMessages = localStorage.getItem('chatMessages');
    const savedBrowserState = localStorage.getItem('browserState');

    if (savedTaskId) {
      setCurrentTaskId(savedTaskId);
      console.log('[App] Restored task ID:', savedTaskId);
    } else {
      // Generate and save taskId immediately on first load
      const newTaskId = uuidv4();
      setCurrentTaskId(newTaskId);
      localStorage.setItem('currentTaskId', newTaskId);
      console.log('[App] Created new task ID:', newTaskId);
    }

    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
        console.log('[App] Restored messages');
      } catch (e) {
        console.error('[App] Failed to restore messages:', e);
      }
    }

    if (savedBrowserState) {
      try {
        setBrowserState(JSON.parse(savedBrowserState));
        console.log('[App] Restored browser state');
      } catch (e) {
        console.error('[App] Failed to restore browser state:', e);
      }
    }
  }, []);

  // Save session to localStorage when state changes
  useEffect(() => {
    if (currentTaskId) {
      localStorage.setItem('currentTaskId', currentTaskId);
    }
  }, [currentTaskId]);

  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatMessages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (browserState.url || browserState.ready) {
      localStorage.setItem('browserState', JSON.stringify(browserState));
    }
  }, [browserState]);

  useEffect(() => {
    // Initialize sandbox only once when we have a taskId
    if (currentTaskId) {
      const savedTaskId = localStorage.getItem('currentTaskId');
      // Only initialize if this is a new taskId (not restored from localStorage)
      if (currentTaskId === savedTaskId && browserState.ready) {
        console.log('[App] Using existing sandbox session');
      } else {
        console.log('[App] Initializing new sandbox session');
        initializeSandbox();
      }
    }
  }, [currentTaskId]); // Only run when taskId is set

  const initializeSandbox = async () => {
    try {
      addSystemMessage('Initializing browser sandbox...');
      
      const response = await fetch('/api/sandbox/init', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        addSystemMessage('Browser ready!');
        setBrowserState(prev => ({ ...prev, ready: true }));
      }
    } catch (error) {
      addSystemMessage('Failed to initialize browser');
      console.error(error);
    }
  };

  const pollState = async () => {
    if (!currentTaskId) return;

    try {
      const response = await fetch(`/api/agent/status?taskId=${currentTaskId}`);
      const data = await response.json();

      if (data.browserState) {
        setBrowserState(prev => ({
          ...prev,
          ...data.browserState,
        }));
      }

      if (data.screenshot) {
        console.log('[Frontend] Screenshot received:', data.screenshot.length, 'chars');
        console.log('[Frontend] Screenshot preview:', data.screenshot.substring(0, 50));
        setScreenshot(data.screenshot);
      } else {
        console.log('[Frontend] No screenshot in response');
      }

      if (data.plan) {
        // Update UI with current step
        const currentStep = data.plan.steps[data.plan.currentStepIndex];
        if (currentStep && currentStep.status === 'running') {
          const lastMsg = messages[messages.length - 1];
          if (!lastMsg || !lastMsg.content.includes(currentStep.description)) {
            addSystemMessage(`Executing: ${currentStep.description}`);
          }
        }
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  };

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);

    // CRITICAL: Use existing currentTaskId, don't create a new one!
    // This ensures we reuse the SAME sandbox
    if (!currentTaskId) {
      addSystemMessage('Error: No sandbox session. Please refresh the page.');
      return;
    }

    try {
      addSystemMessage('Planning actions...');

      // Execute task directly using the EXISTING taskId
      const response = await fetch('/api/browser/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: currentTaskId, intent: content }),
      });

      const data = await response.json();

      if (data.success) {
        addSystemMessage(`Task started: ${data.plan.steps.length} steps planned`);
        if (data.message) {
          addSystemMessage(data.message);
        }
      } else {
        addSystemMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      addSystemMessage('Failed to start task');
      console.error(error);
    }
  };

  const addSystemMessage = (content: string) => {
    const message: ChatMessage = {
      id: uuidv4(),
      role: 'system',
      content,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, message]);
  };
  const handleRefresh = async () => {
    console.log('[App] Refresh button clicked');
    if (!currentTaskId) {
      console.log('[App] No task ID, initializing new sandbox');
      await initializeSandbox();
      return;
    }

    try {
      addSystemMessage('Refreshing browser...');
      const response = await fetch('/api/browser/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: currentTaskId,
          action: {
            type: 'navigate',
            url: browserState.url || 'https://www.youtube.com',
          },
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.state) {
          setBrowserState(result.state);
        }
        addSystemMessage('Browser refreshed');
      }
    } catch (error) {
      console.error('[App] Refresh failed:', error);
      addSystemMessage('Refresh failed: ' + String(error));
    }
  };
  return (
    <main className="h-screen flex bg-gray-950 relative">
      {/* Left Panel - Chat (1/4 width) */}
      <div className="w-1/4 min-w-[300px]">
        <ChatPanel onSendMessage={handleSendMessage} messages={messages} />
      </div>

      {/* Right Panel - Browser Stream (3/4 width) */}
      <div className="flex-1">
        <BrowserStream 
          browserState={browserState} 
          screenshot={screenshot}
          onRefresh={handleRefresh}
        />
      </div>

      {/* DevMind Link */}
      <a
        href="/devmind"
        className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full text-xs font-medium bg-purple-600/20 text-purple-400 border border-purple-600/30 hover:bg-purple-600/40 transition-all z-50"
      >
        🧠 DevMind
      </a>
    </main>
  );
}
