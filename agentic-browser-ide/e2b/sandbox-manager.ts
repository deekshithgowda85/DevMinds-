// Enterprise Sandbox Manager - Handles lifecycle, pooling, and health checks
import 'dotenv/config';
import { BrowserSandbox } from './sandbox';

interface SandboxSession {
  id: string;
  sandbox: BrowserSandbox;
  createdAt: number;
  lastUsed: number;
  taskIds: Set<string>;
  keepAliveInterval?: NodeJS.Timeout;
}

export class SandboxManager {
  private static instance: SandboxManager;
  private sessions: Map<string, SandboxSession> = new Map();
  private readonly DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private readonly KEEP_ALIVE_INTERVAL = 60 * 1000; // 1 minute
  private readonly MAX_IDLE_TIME = 10 * 60 * 1000; // 10 minutes
  private cleanupInterval?: NodeJS.Timeout;

  private constructor() {
    this.startCleanupTask();
  }

  static getInstance(): SandboxManager {
    if (!SandboxManager.instance) {
      SandboxManager.instance = new SandboxManager();
    }
    return SandboxManager.instance;
  }

  async getOrCreateSandbox(taskId?: string): Promise<BrowserSandbox> {
    // Try to find an existing session
    if (taskId) {
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.taskIds.has(taskId)) {
          console.log(`[Manager] ✅ REUSING existing session ${sessionId} for task ${taskId}`);
          console.log(`[Manager] Session has ${session.taskIds.size} tasks, age: ${Math.round((Date.now() - session.createdAt) / 1000)}s`);
          session.lastUsed = Date.now();
          return session.sandbox;
        }
      }
    }

    // Find least loaded session or create new one
    let targetSession = this.findAvailableSession();
    
    if (!targetSession) {
      console.log('[Manager] 🆕 Creating NEW sandbox session...');
      console.log('[Manager] Current active sessions:', this.sessions.size);
      targetSession = await this.createSession();
    } else {
      console.log(`[Manager] Reusing existing session ${targetSession.id}`);
    }

    if (taskId) {
      targetSession.taskIds.add(taskId);
    }
    
    targetSession.lastUsed = Date.now();
    return targetSession.sandbox;
  }

  private async createSession(): Promise<SandboxSession> {
    const sandbox = new BrowserSandbox();
    const sandboxId = await sandbox.initialize();
    await sandbox.startBrowser();

    // Navigate to YouTube by default to avoid blank screen
    console.log('[Manager] Setting default page to YouTube...');
    await sandbox.executeAction({
      id: 'init',
      type: 'navigate',
      url: 'https://youtube.com',
      timestamp: Date.now(),
    });

    const session: SandboxSession = {
      id: sandboxId,
      sandbox,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      taskIds: new Set(),
    };

    // Start keep-alive to prevent timeout
    session.keepAliveInterval = setInterval(() => {
      this.keepAlive(session);
    }, this.KEEP_ALIVE_INTERVAL);

    this.sessions.set(sandboxId, session);
    console.log(`[Manager] Session ${sandboxId} created. Active sessions: ${this.sessions.size}`);

    return session;
  }

  private async keepAlive(session: SandboxSession): Promise<void> {
    try {
      // Execute a lightweight operation to keep sandbox alive
      await session.sandbox.getState();
      console.log(`[Manager] Keep-alive sent for session ${session.id}`);
    } catch (error) {
      console.error(`[Manager] Keep-alive failed for ${session.id}:`, error);
      await this.destroySession(session.id);
    }
  }

  private findAvailableSession(): SandboxSession | null {
    // Find session with fewest active tasks
    let minTasks = Infinity;
    let targetSession: SandboxSession | null = null;

    for (const session of this.sessions.values()) {
      const age = Date.now() - session.createdAt;
      if (age < this.DEFAULT_TIMEOUT && session.taskIds.size < minTasks) {
        minTasks = session.taskIds.size;
        targetSession = session;
      }
    }

    return targetSession;
  }

  async destroySession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      console.log(`[Manager] Destroying session ${sessionId}`);
      
      if (session.keepAliveInterval) {
        clearInterval(session.keepAliveInterval);
      }

      try {
        await session.sandbox.close();
      } catch (error) {
        console.error(`[Manager] Error closing session ${sessionId}:`, error);
      }

      this.sessions.delete(sessionId);
      console.log(`[Manager] Active sessions: ${this.sessions.size}`);
    }
  }

  releaseTask(taskId: string): void {
    for (const session of this.sessions.values()) {
      session.taskIds.delete(taskId);
    }
  }

  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions();
    }, 60 * 1000); // Run every minute
  }

  private async cleanupIdleSessions(): Promise<void> {
    const now = Date.now();
    const sessionsToDestroy: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      const idleTime = now - session.lastUsed;
      const age = now - session.createdAt;

      if (idleTime > this.MAX_IDLE_TIME || age > this.DEFAULT_TIMEOUT) {
        console.log(`[Manager] Session ${sessionId} idle for ${Math.floor(idleTime / 1000)}s, destroying...`);
        sessionsToDestroy.push(sessionId);
      }
    }

    for (const sessionId of sessionsToDestroy) {
      await this.destroySession(sessionId);
    }
  }

  async shutdown(): Promise<void> {
    console.log('[Manager] Shutting down all sessions...');
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    const destroyPromises = Array.from(this.sessions.keys()).map(id => 
      this.destroySession(id)
    );

    await Promise.all(destroyPromises);
    console.log('[Manager] Shutdown complete');
  }
  async cleanupAll(force: boolean = false): Promise<{ closed: number; remaining: number; errors: string[] }> {
    console.log(`[Manager] Cleanup all sandboxes (force: ${force})`);
    
    const errors: string[] = [];
    let closed = 0;

    const sessionIds = Array.from(this.sessions.keys());
    
    for (const sessionId of sessionIds) {
      try {
        const session = this.sessions.get(sessionId);
        if (!session) continue;

        const idleTime = Date.now() - session.lastUsed;
        const shouldClose = force || idleTime > this.MAX_IDLE_TIME;

        if (shouldClose) {
          console.log(`[Manager] Closing session ${sessionId} (idle: ${Math.round(idleTime / 1000)}s)`);
          await this.destroySession(sessionId);
          closed++;
        }
      } catch (error) {
        const errorMsg = `Failed to close session ${sessionId}: ${error}`;
        console.error(`[Manager] ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    return {
      closed,
      remaining: this.sessions.size,
      errors,
    };
  }
  getStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(s => ({
        id: s.id,
        age: Date.now() - s.createdAt,
        idleTime: Date.now() - s.lastUsed,
        activeTasks: s.taskIds.size,
      })),
    };
  }
}

// Global singleton instance
export function getSandboxManager(): SandboxManager {
  return SandboxManager.getInstance();
}

// Export for backwards compatibility
export async function getBrowserSandbox(taskId?: string): Promise<BrowserSandbox> {
  const manager = getSandboxManager();
  return manager.getOrCreateSandbox(taskId);
}

export async function closeSandbox(): Promise<void> {
  // For test compatibility - initiates cleanup
  const manager = getSandboxManager();
  await manager.shutdown();
}

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n[Manager] Received SIGINT, shutting down gracefully...');
  await getSandboxManager().shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n[Manager] Received SIGTERM, shutting down gracefully...');
  await getSandboxManager().shutdown();
  process.exit(0);
});
