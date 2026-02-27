// Core types for Agentic Browser IDE

export type BrowserAction = {
  id: string;
  type: 'navigate' | 'click' | 'type' | 'scroll' | 'submit' | 'wait' | 'screenshot';
  selector?: string;
  value?: string;
  url?: string;
  timestamp: number;
};

export type AgentStep = {
  id: string;
  description: string;
  action: BrowserAction;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  error?: string;
};

export type AgentPlan = {
  taskId: string;
  intent: string;
  steps: AgentStep[];
  currentStepIndex: number;
  status: 'planning' | 'executing' | 'completed' | 'failed';
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
};

export type BrowserState = {
  url: string;
  title: string;
  ready: boolean;
};

export type StreamState = {
  active: boolean;
  peerId?: string;
};
