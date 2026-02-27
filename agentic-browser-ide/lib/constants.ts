// Application constants

export const CONSTANTS = {
  INNGEST: {
    APP_ID: 'agentic-browser-ide',
  },
  BROWSER: {
    VIEWPORT: { width: 1280, height: 720 },
    TIMEOUT: 30000,
  },
  AGENT: {
    MAX_STEPS: 20,
    MAX_RETRIES: 3,
  },
} as const;

export const EVENTS = {
  TASK_STARTED: 'app/task.started',
  STEP_EXECUTE: 'app/step.execute',
  STEP_COMPLETED: 'app/step.completed',
  TASK_COMPLETED: 'app/task.completed',
} as const;
