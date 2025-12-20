import { useState, useCallback } from 'react';

export interface SandboxSession {
  sessionId: string;
  sandboxId: string | null;
}

export interface ExecutionResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface FileOperation {
  success: boolean;
  path?: string;
  content?: string;
  message?: string;
  error?: string;
}

export function useE2BSandbox() {
  const [session, setSession] = useState<SandboxSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeSandbox = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/sandbox', {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initialize sandbox');
      }

      const data = await response.json();
      setSession({
        sessionId: data.sessionId,
        sandboxId: data.sandboxId,
      });
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeSandbox = useCallback(async () => {
    if (!session) return;

    setLoading(true);
    try {
      await fetch(`/api/sandbox?sessionId=${session.sessionId}`, {
        method: 'DELETE',
      });
      setSession(null);
    } catch (err) {
      console.error('Failed to close sandbox:', err);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const executeCode = useCallback(
    async (language: string, code: string, filename?: string): Promise<ExecutionResult> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            language,
            code,
            filename,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Execution failed');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const writeFile = useCallback(
    async (path: string, content: string): Promise<FileOperation> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      console.log('writeFile called with:', { sessionId: session.sessionId, path });

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            path,
            content,
          }),
        });

        const data = await response.json();
        console.log('writeFile response:', { ok: response.ok, data });
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to write file');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('writeFile error:', errorMessage);
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const readFile = useCallback(
    async (path: string): Promise<string> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sandbox/files?sessionId=${session.sessionId}&path=${encodeURIComponent(path)}`
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to read file');
        }

        return data.content;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const deleteFile = useCallback(
    async (path: string): Promise<FileOperation> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sandbox/files?sessionId=${session.sessionId}&path=${encodeURIComponent(path)}`,
          { method: 'DELETE' }
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to delete file');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const listFiles = useCallback(
    async (path: string = '/workspace/repo'): Promise<string[]> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/sandbox/files/list?sessionId=${session.sessionId}&path=${encodeURIComponent(path)}`
        );

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to list files');
        }

        return data.files || [];
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const cloneRepository = useCallback(
    async (repoUrl: string, path?: string): Promise<ExecutionResult> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            action: 'clone',
            repoUrl,
            path,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to clone repository');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const gitCommit = useCallback(
    async (path: string, message: string): Promise<ExecutionResult> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            action: 'commit',
            path,
            message,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to commit');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const gitPush = useCallback(
    async (path: string, remote = 'origin', branch = 'main'): Promise<ExecutionResult> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            action: 'push',
            path,
            remote,
            branch,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to push');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  const gitPull = useCallback(
    async (path: string, remote = 'origin', branch = 'main'): Promise<ExecutionResult> => {
      if (!session) {
        throw new Error('Sandbox not initialized');
      }

      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sandbox/git', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: session.sessionId,
            action: 'pull',
            path,
            remote,
            branch,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to pull');
        }

        return data;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [session]
  );

  return {
    session,
    loading,
    error,
    initializeSandbox,
    closeSandbox,
    executeCode,
    writeFile,
    readFile,
    deleteFile,
    listFiles,
    cloneRepository,
    gitCommit,
    gitPush,
    gitPull,
  };
}
