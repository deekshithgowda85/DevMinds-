import { E2BSandboxManager } from './e2b-sandbox';

// Use globalThis to ensure the Map persists across Next.js hot reloads and serverless invocations
// This is a workaround for Next.js API routes not sharing module state
declare global {
  // eslint-disable-next-line no-var
  var __sandboxInstances: Map<string, E2BSandboxManager> | undefined;
}

// Global sandbox instances map
// In production, use Redis or similar distributed cache
// Using globalThis ensures the Map persists across module reloads
if (!globalThis.__sandboxInstances) {
  globalThis.__sandboxInstances = new Map<string, E2BSandboxManager>();
  console.log('[sandbox-instances] Created new global Map instance');
} else {
  console.log('[sandbox-instances] Reusing existing global Map instance');
}

export const sandboxInstances = globalThis.__sandboxInstances;

console.log('[sandbox-instances] Module loaded, Map size:', sandboxInstances.size);

export function getSandboxInstance(sessionId: string): E2BSandboxManager | undefined {
  console.log('[getSandboxInstance] Looking for sessionId:', sessionId);
  console.log('[getSandboxInstance] Current map size:', sandboxInstances.size);
  console.log('[getSandboxInstance] Map keys:', Array.from(sandboxInstances.keys()));
  const instance = sandboxInstances.get(sessionId);
  console.log('[getSandboxInstance] Found instance:', !!instance);
  return instance;
}

export function setSandboxInstance(sessionId: string, sandbox: E2BSandboxManager): void {
  console.log('[setSandboxInstance] Storing sessionId:', sessionId);
  sandboxInstances.set(sessionId, sandbox);
  console.log('[setSandboxInstance] New map size:', sandboxInstances.size);
  console.log('[setSandboxInstance] Map keys:', Array.from(sandboxInstances.keys()));
}

export function deleteSandboxInstance(sessionId: string): void {
  sandboxInstances.delete(sessionId);
}
