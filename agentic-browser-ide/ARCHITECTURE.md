# Agentic Browser IDE - Enterprise Architecture

## Overview

This is an enterprise-level agentic browser automation system with persistent sessions, live streaming, and intelligent task management.

## Architecture Components

### 1. **Sandbox Manager** (`e2b/sandbox-manager.ts`)

**Responsibilities:**

- Sandbox lifecycle management (create, keep-alive, destroy)
- Connection pooling and session reuse
- Automatic cleanup of idle sessions
- Health monitoring and graceful shutdown

**Features:**

- 30-minute sandbox timeout (configurable)
- Keep-alive heartbeat every 60 seconds
- Automatic cleanup of sessions idle > 10 minutes
- Task-to-sandbox session mapping
- Graceful shutdown on SIGINT/SIGTERM

### 2. **Browser Sandbox** (`e2b/sandbox.ts`)

**Responsibilities:**

- Low-level E2B sandbox operations
- Playwright browser automation
- Screenshot capture and state management
- Action execution (navigate, click, type, etc.)

**Features:**

- Persistent Python browser process
- Pre-installed Playwright + Chromium
- Base64 screenshot encoding
- Error handling and retry logic

### 3. **Agent Components**

#### **Executor** (`agent/executor.ts`)

- Executes browser actions
- Retry logic with exponential backoff
- Result logging with size limits

#### **Observer** (`agent/observer.ts`)

- Browser state monitoring
- Screenshot capture
- Success validation

#### **Planner** (`agent/planner.ts`)

- Converts natural language to action plans
- Intent parsing and step generation

#### **State** (`agent/state.ts`)

- Global task state management
- Screenshot and browser state storage

### 4. **API Routes**

#### **Browser Stream** (`app/api/browser/stream/route.ts`)

- Real-time screenshot streaming (2-second intervals)
- Start/stop streaming control
- Background task management

#### **Browser Execute** (`app/api/browser/execute/route.ts`)

- Single action execution
- Direct browser control

#### **Agent Task** (`app/api/agent/task/route.ts`)

- Task creation and management
- Plan generation and execution

#### **Sandbox Health** (`app/api/sandbox/health/route.ts`)

- Health check endpoint
- Session statistics and monitoring

## Data Flow

```
User Request → API Route → Agent Planner → Agent Executor
                              ↓                    ↓
                        Agent State ←→ Sandbox Manager
                              ↓                    ↓
                        Observer ←→ Browser Sandbox (E2B)
                              ↓                    ↓
                        Live Stream ←→ Playwright Browser
```

## Session Lifecycle

1. **Creation**
   - User initiates task
   - Sandbox Manager checks for available session
   - If none available, creates new E2B sandbox
   - Initializes Playwright browser
   - Starts keep-alive heartbeat

2. **Active Use**
   - Task executes actions via sandbox
   - Screenshots captured every 2 seconds (streaming)
   - Keep-alive pings every 60 seconds
   - Session tracks active tasks

3. **Cleanup**
   - Task completes → releases from session
   - Session idle > 10 minutes → destroyed
   - Session age > 30 minutes → destroyed
   - Manual shutdown → all sessions destroyed gracefully

## Configuration

### Timeouts

```typescript
DEFAULT_TIMEOUT = 30 * 60 * 1000; // 30 minutes
KEEP_ALIVE_INTERVAL = 60 * 1000; // 1 minute
MAX_IDLE_TIME = 10 * 60 * 1000; // 10 minutes
STREAM_INTERVAL = 2000; // 2 seconds
```

### Environment Variables

```env
E2B_API_KEY=your_api_key_here
```

## Monitoring & Health

### Health Check Endpoint

```
GET /api/sandbox/health
```

**Response:**

```json
{
  "healthy": true,
  "activeSessions": 2,
  "sessions": [
    {
      "id": "sandbox-id-123",
      "age": 120000,
      "idleTime": 5000,
      "activeTasks": 1
    }
  ],
  "timestamp": "2026-02-10T12:00:00.000Z"
}
```

## Streaming Architecture

### Live Screenshot Streaming

- Continuous capture every 2 seconds
- Base64-encoded PNG images
- Automatic retry on failure
- Task-specific stream management

### Stream Control

```typescript
POST /api/browser/stream
{
  "taskId": "task-123",
  "action": "start" | "stop"
}
```

## Error Handling

### Retry Strategy

- Executor: 3 attempts with exponential backoff
- Observer: Automatic fallback to screenshot action
- Stream: 2-second retry delay on error

### Timeout Prevention

- Keep-alive heartbeat every 60 seconds
- Extended sandbox timeout (30 minutes)
- Automatic session refresh before expiry

## Best Practices

1. **Always pass taskId** when getting sandbox for proper session management
2. **Stop streaming** when task completes to release resources
3. **Monitor health endpoint** for production deployments
4. **Configure timeouts** based on your use case
5. **Use graceful shutdown** to prevent orphaned sandboxes

## Scaling Considerations

- Multiple sessions supported (automatic pooling)
- Least-loaded session assignment
- Automatic cleanup prevents resource leaks
- Health monitoring for load balancing
- Horizontal scaling via API replication

## Future Enhancements

- [ ] Redis-based session state for multi-instance deployments
- [ ] WebSocket streaming for real-time updates
- [ ] Advanced scheduling and prioritization
- [ ] Machine learning-based action optimization
- [ ] Distributed tracing and observability
- [ ] Multi-browser support (Firefox, Safari)
- [ ] Video recording capabilities
- [ ] Advanced error recovery strategies
