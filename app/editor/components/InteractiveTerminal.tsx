"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TerminalProps {
  sessionId: string | null;
  onOutput?: (data: string) => void;
}

interface CommandHistory {
  command: string;
  timestamp: number;
}

export interface TerminalRef {
  addOutput: (lines: string[]) => void;
  clearOutput: () => void;
}

export const InteractiveTerminal = forwardRef<TerminalRef, TerminalProps>(({ sessionId, onOutput }, ref) => {
  const [output, setOutput] = useState<string[]>(['Welcome to E2B Interactive Terminal', '$ ']);
  const [currentCommand, setCurrentCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [terminalId, setTerminalId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    addOutput: (lines: string[]) => {
      setOutput(prev => {
        const newOutput = [...prev];
        // Remove the last '$ ' prompt if exists
        if (newOutput[newOutput.length - 1] === '$ ') {
          newOutput.pop();
        }
        // Add new lines
        newOutput.push(...lines);
        // Add prompt back
        newOutput.push('$ ');
        return newOutput;
      });
    },
    clearOutput: () => {
      setOutput(['Welcome to E2B Interactive Terminal', '$ ']);
    }
  }));

  // Load command history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('terminal-history');
    if (savedHistory) {
      try {
        const parsed: CommandHistory[] = JSON.parse(savedHistory);
        setCommandHistory(parsed.map(h => h.command));
      } catch (e) {
        console.error('Failed to parse command history:', e);
      }
    }
  }, []);

  // Save command history to localStorage
  const saveCommandHistory = (command: string) => {
    const newHistory = [...commandHistory, command].slice(-100); // Keep last 100 commands
    setCommandHistory(newHistory);
    
    const historyData: CommandHistory[] = newHistory.map(cmd => ({
      command: cmd,
      timestamp: Date.now(),
    }));
    localStorage.setItem('terminal-history', JSON.stringify(historyData));
  };

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [output]);

  // Start terminal session
  useEffect(() => {
    if (sessionId && !terminalId) {
      startTerminalSession();
    }
    
    return () => {
      // Cleanup event source on unmount
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const startTerminalSession = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/sandbox/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'start',
        }),
      });

      const data = await response.json();
      if (data.terminalId) {
        setTerminalId(data.terminalId);
        console.log('[Terminal] Started with ID:', data.terminalId);
        
        // Start listening to terminal output
        connectToTerminalStream();
      }
    } catch (error) {
      console.error('[Terminal] Failed to start:', error);
      setOutput(prev => [...prev, '❌ Failed to start terminal session']);
    }
  };

  const connectToTerminalStream = () => {
    if (!sessionId) return;

    const eventSource = new EventSource(`/api/sandbox/terminal/stream?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case 'connected':
            setIsConnected(true);
            console.log('[Terminal] Stream connected');
            break;
            
          case 'data':
            // Add terminal output to display
            setOutput(prev => {
              const newOutput = [...prev];
              // Remove the last prompt line if it exists
              if (newOutput[newOutput.length - 1] === '$ ') {
                newOutput.pop();
              }
              // Add the data
              newOutput.push(message.data);
              // Add prompt back
              newOutput.push('$ ');
              return newOutput;
            });
            if (onOutput) onOutput(message.data);
            break;
            
          case 'exit':
            setIsConnected(false);
            setOutput(prev => [...prev, '❌ Terminal session ended']);
            eventSource.close();
            break;
        }
      } catch (error) {
        console.error('[Terminal] Failed to parse message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[Terminal] Stream error:', error);
      setIsConnected(false);
      eventSource.close();
    };
  };

  const sendCommand = async (command: string) => {
    if (!sessionId) {
      setOutput(prev => [...prev.slice(0, -1), `$ ${command}`, '❌ No sandbox session', '$ ']);
      return;
    }
    
    // Add command to output
    setOutput(prev => [...prev.slice(0, -1), `$ ${command}`, '']);
    
    // Save to history
    if (command.trim()) {
      saveCommandHistory(command.trim());
      setHistoryIndex(-1);
    }

    try {
      // Send command + newline
      const response = await fetch('/api/sandbox/terminal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          action: 'send',
          data: command + '\n',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send command');
      }

      // Output is now handled by the stream

    } catch (error) {
      console.error('[Terminal] Failed to send command:', error);
      setOutput(prev => [...prev, '❌ Command failed', '$ ']);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentCommand.trim()) {
      sendCommand(currentCommand);
      setCurrentCommand('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex + 1;
        if (newIndex < commandHistory.length) {
          setHistoryIndex(newIndex);
          setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentCommand(commandHistory[commandHistory.length - 1 - newIndex]);
      } else {
        setHistoryIndex(-1);
        setCurrentCommand('');
      }
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      setOutput(prev => [...prev.slice(0, -1), '$ ^C', '$ ']);
      setCurrentCommand('');
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault();
      setOutput(['$ ']);
      setCurrentCommand('');
    }
  };

  return (
    <div className="h-full flex flex-col bg-black text-green-400 font-mono text-sm">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-700 bg-gray-900">
        <span className="text-xs font-semibold text-gray-400">TERMINAL</span>
        {isConnected && (
          <span className="flex items-center gap-1 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
      </div>
      
      <ScrollArea className="flex-1 p-3" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
        <div className="space-y-0">
          {output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all leading-relaxed">
              {line}
            </div>
          ))}
          {/* Inline input - appears seamlessly after last output */}
          <div className="flex items-start">
            <input
              ref={inputRef}
              type="text"
              value={currentCommand}
              onChange={(e) => setCurrentCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={false}
              className="flex-1 bg-transparent text-green-400 outline-none border-none font-mono caret-green-400 leading-relaxed"
              autoFocus
              placeholder={!terminalId ? "Connecting to terminal..." : ""}
              style={{ width: '100%', minHeight: '1.5em' }}
            />
          </div>
        </div>
      </ScrollArea>
      
      <div className="px-3 py-1 bg-gray-900 border-t border-gray-700 text-xs text-gray-500 flex items-center justify-between">
        <span>Ctrl+C: Cancel | Ctrl+L: Clear | ↑↓: History</span>
        {!terminalId && <span className="text-yellow-500 animate-pulse">Connecting...</span>}
      </div>
    </div>
  );
});

InteractiveTerminal.displayName = 'InteractiveTerminal';
