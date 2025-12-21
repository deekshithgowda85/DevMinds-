# 🔄 Multi-Agent Debugger Flow Diagrams

## Table of Contents

1. [User Journey Flow](#user-journey-flow)
2. [Multi-Agent Workflow](#multi-agent-workflow)
3. [Code Execution Flow](#code-execution-flow)
4. [Repository Analysis Flow](#repository-analysis-flow)
5. [Authentication Flow](#authentication-flow)
6. [Error Handling Flow](#error-handling-flow)

---

## User Journey Flow

### Complete User Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                                     │
└─────────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
┌─────────────┐
│  Landing    │  Features: Hero, About, Footer
│   Page      │
└──────┬──────┘
       │
       ├──────────────┬──────────────┬──────────────┐
       │              │              │              │
       ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│   Login  │   │  Editor  │   │ Services │   │ Projects │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │
     ▼              │              │              │
┌──────────┐        │              │              │
│   Auth   │        │              │              │
│ (NextAuth│        │              │              │
└────┬─────┘        │              │              │
     │              │              │              │
     └──────────────┴──────────────┴──────────────┘
                    │
                    ▼
            ┌───────────────┐
            │  Authenticated│
            │     User      │
            └───────┬───────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│Code Editor  │ │  Analyze    │ │   Manage    │
│             │ │  Projects   │ │  Projects   │
│- Write code │ │             │ │             │
│- Run simple │ │- Clone repo │ │- View saved │
│- AI debug   │ │- Visualize  │ │- Share      │
│- Git ops    │ │- Export     │ │- Delete     │
└─────────────┘ └─────────────┘ └─────────────┘
```

---

## Multi-Agent Workflow

### AI-Powered Debugging Sequence

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT DEBUG WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

USER SUBMITS CODE
      │
      ▼
┌──────────────────────────────────────┐
│  Frontend: Editor Component          │
│  - User clicks "AI Code Fix"         │
│  - Validates code not empty          │
│  - Shows loading state               │
└─────────────────┬────────────────────┘
                  │
                  ▼ POST /api/debug/analyze
┌──────────────────────────────────────┐
│  API Route: /api/debug/analyze       │
│  - Authenticates user                │
│  - Creates debug session             │
│  - Stores code in Supabase           │
│  - Triggers Inngest event            │
└─────────────────┬────────────────────┘
                  │
                  ▼ Event: "debug/analyze"
┌──────────────────────────────────────┐
│  Inngest: Orchestrator Agent         │
│  - Receives event                    │
│  - Initializes workflow state        │
│  - Coordinates agent execution       │
└─────────────────┬────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │   AGENT PIPELINE    │
        └─────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐
│ Step 1 │   │ Step 2 │   │ Step 3 │
│Scanner │   │Validator   │ Fixer  │
└───┬────┘   └───┬────┘   └───┬────┘
    │            │            │
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          STEP 1: SCANNER AGENT                  │
│                                                  │
│  Input: { code, language, sessionId }           │
│                                                  │
│  Process:                                       │
│  1. Initialize E2B sandbox                      │
│  2. Create temp file with code                  │
│  3. Run syntax checker                          │
│  4. Call Gemini AI for analysis                 │
│  5. Parse AI response                           │
│                                                  │
│  AI Prompt:                                     │
│  "Analyze this code and identify:               │
│   - Syntax errors                               │
│   - Logic errors                                │
│   - Performance issues                          │
│   - Security vulnerabilities                    │
│   Return JSON with severity levels"             │
│                                                  │
│  Output: {                                      │
│    errors: [...],                               │
│    warnings: [...],                             │
│    suggestions: [...]                           │
│  }                                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          STEP 2: VALIDATOR AGENT                │
│                                                  │
│  Input: { scanResults, code, sessionId }        │
│                                                  │
│  Process:                                       │
│  1. Review scanner findings                     │
│  2. Prioritize issues by severity               │
│  3. Determine fixability                        │
│  4. Call Gemini AI for validation               │
│  5. Generate fix strategy                       │
│                                                  │
│  AI Prompt:                                     │
│  "Review these identified issues:               │
│   [scanResults]                                 │
│   Validate each issue and determine:            │
│   - Is it a real bug?                           │
│   - What's the fix strategy?                    │
│   - Confidence level (0-100)                    │
│   Return prioritized fix plan"                  │
│                                                  │
│  Output: {                                      │
│    validatedIssues: [...],                      │
│    fixStrategy: [...],                          │
│    confidence: 85                               │
│  }                                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│          STEP 3: FIXER AGENT                    │
│                                                  │
│  Input: { validatedIssues, code, sessionId }    │
│                                                  │
│  Process:                                       │
│  1. Generate fixes for each issue               │
│  2. Call Gemini AI for code fixes               │
│  3. Apply fixes line-by-line                    │
│  4. Verify syntax of fixed code                 │
│  5. Test in E2B sandbox                         │
│                                                  │
│  AI Prompt:                                     │
│  "Fix these issues in the code:                 │
│   [validatedIssues]                             │
│   For each issue:                               │
│   - Provide exact fix                           │
│   - Show before/after                           │
│   - Explain reasoning                           │
│   Return line-by-line changes"                  │
│                                                  │
│  Output: {                                      │
│    fixedCode: "...",                            │
│    changes: [...],                              │
│    explanation: "..."                           │
│  }                                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│       STEP 4: FILE WRITER AGENT (Optional)      │
│                                                  │
│  Input: { fixedCode, filepath, sessionId }      │
│                                                  │
│  Process:                                       │
│  1. Connect to E2B sandbox                      │
│  2. Write fixed code to file                    │
│  3. Verify write success                        │
│  4. Update file metadata                        │
│                                                  │
│  Output: {                                      │
│    success: true,                               │
│    filepath: "/workspace/fixed.js"              │
│  }                                              │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Orchestrator: Collect Results       │
│  - Aggregate all agent outputs        │
│  - Calculate overall success          │
│  - Store in Supabase                  │
│  - Update session status              │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  API: Poll Results                   │
│  GET /api/debug/poll?sessionId=...   │
│  - Frontend polls every 2 seconds     │
│  - Returns latest results             │
│  - Shows progress updates             │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Frontend: Display Results           │
│  - Show original vs fixed code        │
│  - List all issues found              │
│  - Display AI explanations            │
│  - "Apply Fix" button                 │
└──────────────────────────────────────┘
```

### Agent Communication Protocol

```
┌─────────────────────────────────────────────────┐
│         INNGEST EVENT STRUCTURE                  │
└─────────────────────────────────────────────────┘

Event: "debug/analyze"
{
  "name": "debug/analyze",
  "data": {
    "sessionId": "uuid-v4",
    "code": "source code",
    "language": "javascript",
    "userId": "user-id"
  }
}

       ↓

Agent Communication:
Scanner → Validator → Fixer → Writer

Each agent returns:
{
  "step": "scanner",
  "status": "completed",
  "output": {...},
  "nextStep": "validator",
  "timestamp": "2024-01-01T00:00:00Z"
}

       ↓

Final Result Stored in Supabase:
{
  "sessionId": "uuid-v4",
  "status": "completed",
  "results": {
    "scanner": {...},
    "validator": {...},
    "fixer": {...}
  },
  "createdAt": "...",
  "completedAt": "..."
}
```

---

## Code Execution Flow

### Simple Execution (No AI)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SIMPLE CODE EXECUTION FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

USER CLICKS "RUN"
      │
      ▼
┌──────────────────────────────────────┐
│  Editor: Validate Input              │
│  - Check code is not empty            │
│  - Validate language selected         │
│  - Disable Run button                 │
└─────────────────┬────────────────────┘
                  │
                  ▼ POST /api/sandbox/execute
┌──────────────────────────────────────┐
│  API: Execute Endpoint               │
│  - Authenticate request               │
│  - Extract: code, language, stdin     │
│  - Get/create sandbox instance        │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  E2B Sandbox Manager                 │
│  - Initialize sandbox (if needed)     │
│  - Get sandbox ID                     │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  executeCode()                       │
│                                      │
│  Switch (language):                  │
│    JavaScript → node temp.js         │
│    Python → python3 temp.py          │
│    Java → javac & java               │
│    C++ → g++ & ./executable          │
│    Go → go run temp.go               │
│    Rust → rustc & ./executable       │
└─────────────────┬────────────────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌────────┐   ┌────────┐   ┌────────┐
│ Write  │   │Compile │   │Execute │
│  File  │   │ (if    │   │Command │
│        │   │needed) │   │        │
└───┬────┘   └───┬────┘   └───┬────┘
    │            │            │
    └────────────┴────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  E2B Container Execution             │
│  - Isolated environment               │
│  - Resource limits                    │
│  - 60 second timeout                  │
│  - Capture stdout/stderr              │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Return Result                       │
│  {                                   │
│    stdout: "output",                 │
│    stderr: "errors",                 │
│    exitCode: 0,                      │
│    command: "node temp.js"           │
│  }                                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Frontend: Display Output            │
│  - Show in OUTPUT panel               │
│  - Highlight errors in red            │
│  - Show execution time                │
│  - Enable Run button                  │
└──────────────────────────────────────┘
```

### Stdin Input Handling

```
USER PROVIDES STDIN
      │
      ▼
┌──────────────────────────────────────┐
│  Stdin Input Modal                   │
│  - User types input                   │
│  - Supports multi-line                │
│  - Previews before execution          │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  executeCode() with stdin            │
│                                      │
│  Command transformation:             │
│  echo 'stdin' | node temp.js         │
│                                      │
│  Escaping:                           │
│  - Replace ' with '\''               │
│  - Preserve newlines                  │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  E2B Execution                       │
│  - Pipe stdin to process              │
│  - Capture all output                 │
└──────────────────────────────────────┘
```

---

## Repository Analysis Flow

### GitHub Project Analyzer

```
┌─────────────────────────────────────────────────────────────────────────┐
│                  REPOSITORY ANALYSIS WORKFLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

USER ENTERS GITHUB URL
      │
      ▼
┌──────────────────────────────────────┐
│  Services Page: Input Validation     │
│  - Check URL format                   │
│  - Validate github.com domain         │
│  - Show loading spinner               │
└─────────────────┬────────────────────┘
                  │
                  ▼ POST /api/analyze-project
┌──────────────────────────────────────┐
│  API: Analyze Project Endpoint       │
│  - Validate request                   │
│  - Initialize E2B sandbox             │
│  - Start analysis                     │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  E2B: Clone Repository               │
│  git clone --depth 1 <url>           │
│  - Shallow clone (faster)             │
│  - Extract repo name                  │
│  - Verify clone success               │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  E2B: List All Files                 │
│  find /path -type f                  │
│  - Exclude .git directory             │
│  - Limit to 1000 files                │
│  - Get full file paths                │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Categorize Files                    │
│                                      │
│  By extension and path:              │
│  - page.tsx → Page                   │
│  - component → Component              │
│  - api/ → API                        │
│  - lib/ → Library                    │
│  - model → Model                     │
│  - hook → Hook                       │
│  - config → Config                   │
│  - util → Utility                    │
│  - other → Other                     │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Read File Contents                  │
│  For each file:                      │
│  - Read first 10,000 chars            │
│  - Parse imports                      │
│  - Detect dependencies                │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Parse Imports (Enhanced)            │
│                                      │
│  Regex patterns:                     │
│  1. import X from 'Y'                │
│  2. import { X } from 'Y'            │
│  3. const X = require('Y')           │
│  4. import * as X from 'Y'           │
│                                      │
│  Extract:                            │
│  - Module name                       │
│  - Import type (default/named)        │
│  - Relative vs absolute               │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Match Import Paths                  │
│                                      │
│  Strategies:                         │
│  1. Full path match                  │
│     './components/Button'            │
│     → components/Button.tsx          │
│                                      │
│  2. Filename match                   │
│     'Button' → Button.tsx            │
│                                      │
│  3. Partial path match               │
│     'utils/helper'                   │
│     → lib/utils/helper.ts            │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Generate Graph Data                 │
│                                      │
│  Nodes:                              │
│  {                                   │
│    id: "file-path",                  │
│    type: "custom",                   │
│    data: {                           │
│      label: "filename",              │
│      category: "Component",          │
│      path: "/full/path"              │
│    },                                │
│    position: { x, y }                │
│  }                                   │
│                                      │
│  Edges:                              │
│  {                                   │
│    id: "source->target",             │
│    source: "source-file",            │
│    target: "target-file",            │
│    animated: true,                   │
│    style: { stroke: '#8b5cf6' }      │
│  }                                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Calculate Statistics                │
│  {                                   │
│    totalFiles: 42,                   │
│    pages: 5,                         │
│    components: 12,                   │
│    apis: 8,                          │
│    libs: 7,                          │
│    models: 3,                        │
│    hooks: 2,                         │
│    configs: 3,                       │
│    utils: 2                          │
│  }                                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Return to Frontend                  │
│  {                                   │
│    success: true,                    │
│    nodes: [...],                     │
│    edges: [...],                     │
│    stats: {...}                      │
│  }                                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  ReactFlow Visualization             │
│  - Layout nodes with dagre            │
│  - Apply category colors              │
│  - Add zoom/pan controls              │
│  - Enable node selection              │
│  - Show stats cards                   │
└──────────────────────────────────────┘
```

### Category-Based Layout

```
         Pages (Purple)
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
Components  APIs    Hooks
 (Blue)   (Green)  (Orange)
    │         │         │
    └────┬────┴────┬────┘
         ▼         ▼
       Utils     Models
      (Pink)    (Cyan)
```

---

## Authentication Flow

### User Registration & Login

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                                  │
└─────────────────────────────────────────────────────────────────────────┘

NEW USER
  │
  ▼
┌──────────────────────────────────────┐
│  /auth/signup Page                   │
│  - Enter email                        │
│  - Enter password                     │
│  - Validate form                      │
└─────────────────┬────────────────────┘
                  │
                  ▼ POST /api/auth/signup
┌──────────────────────────────────────┐
│  Signup API Route                    │
│  - Hash password (bcrypt)             │
│  - Check if user exists               │
│  - Create user in Supabase            │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Supabase: Create User               │
│  INSERT INTO users                   │
│  - Store hashed password              │
│  - Generate user ID                   │
│  - Set created_at timestamp           │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Redirect to Login                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
EXISTING USER
  │
  ▼
┌──────────────────────────────────────┐
│  /auth/login Page                    │
│  - Enter credentials                  │
│  - Submit form                        │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  NextAuth.js                         │
│  - Credentials provider               │
│  - Verify password                    │
│  - Generate JWT token                 │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Session Created                     │
│  - Store in cookies                   │
│  - Set expiry (30 days)               │
│  - Return session token               │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Redirect to /editor                 │
│  - User is authenticated              │
│  - Can access protected routes        │
└──────────────────────────────────────┘

PROTECTED ROUTE ACCESS
  │
  ▼
┌──────────────────────────────────────┐
│  Middleware: Check Session           │
│  - Verify JWT token                   │
│  - Check expiry                       │
│  - Allow/deny access                  │
└──────────────────────────────────────┘
```

---

## Error Handling Flow

### Comprehensive Error Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ERROR HANDLING FLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

ERROR OCCURS
  │
  ├─── Frontend Error
  │         │
  │         ▼
  │    ┌──────────────────────────────┐
  │    │  React Error Boundary         │
  │    │  - Catch render errors         │
  │    │  - Log to console              │
  │    │  - Show fallback UI            │
  │    └──────────────────────────────┘
  │
  ├─── API Error
  │         │
  │         ▼
  │    ┌──────────────────────────────┐
  │    │  API Route Error Handler      │
  │    │  - Catch exceptions            │
  │    │  - Return JSON error           │
  │    │  - Set appropriate status code │
  │    │                                │
  │    │  Status Codes:                 │
  │    │  - 400: Bad Request            │
  │    │  - 401: Unauthorized           │
  │    │  - 404: Not Found              │
  │    │  - 500: Server Error           │
  │    └──────────────────────────────┘
  │
  ├─── E2B Sandbox Error
  │         │
  │         ▼
  │    ┌──────────────────────────────┐
  │    │  E2B Error Handler            │
  │    │  - Timeout (60s)               │
  │    │  - Sandbox not found           │
  │    │  - Execution failure           │
  │    │  - Return ExecutionResult      │
  │    │    with error field            │
  │    └──────────────────────────────┘
  │
  ├─── Gemini AI Error
  │         │
  │         ▼
  │    ┌──────────────────────────────┐
  │    │  AI Error Handler             │
  │    │  - Rate limit exceeded         │
  │    │  - Invalid API key             │
  │    │  - Model unavailable           │
  │    │  - Fallback to simple mode     │
  │    └──────────────────────────────┘
  │
  └─── Database Error
            │
            ▼
       ┌──────────────────────────────┐
       │  Supabase Error Handler       │
       │  - Connection timeout          │
       │  - Query error                 │
       │  - Auth failure                │
       │  - Retry with backoff          │
       └──────────────────────────────┘

ALL ERRORS
  │
  ▼
┌──────────────────────────────────────┐
│  Centralized Error Logger            │
│  - Log to console                     │
│  - Store in database (if critical)    │
│  - Send to monitoring (production)    │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  User-Friendly Error Message         │
│  - Don't expose internals             │
│  - Provide actionable steps           │
│  - Show support contact               │
└──────────────────────────────────────┘
```

---

## State Management Flow

### Application State Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT                                  │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────┐
│  Client State (React State)          │
│                                      │
│  - Code content (editor)              │
│  - UI state (loading, errors)         │
│  - Form inputs                        │
│  - Modal visibility                   │
│  - Graph data (ReactFlow)             │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Session State (NextAuth)            │
│                                      │
│  - User authentication                │
│  - JWT tokens                         │
│  - Session expiry                     │
│  - User profile                       │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Sandbox State (In-Memory)           │
│                                      │
│  - Active sandboxes Map               │
│  - Sandbox ID → Instance              │
│  - Auto-cleanup (10 min)              │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Persistent State (Supabase)         │
│                                      │
│  - User profiles                      │
│  - Projects                           │
│  - Debug sessions                     │
│  - Analysis results                   │
└──────────────────────────────────────┘

State Updates Flow:
User Action → React State → API Call → Database → Response → Update UI
```

---

## WebSocket/Polling Flow

### Real-Time Updates

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     POLLING MECHANISM                                    │
└─────────────────────────────────────────────────────────────────────────┘

USER TRIGGERS AI DEBUG
  │
  ▼
┌──────────────────────────────────────┐
│  Start Analysis                      │
│  - Create session ID                  │
│  - Store sessionId in state           │
│  - Start polling interval             │
└─────────────────┬────────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │  Polling Loop  │
         │  Every 2s      │
         └────────┬───────┘
                  │
     ┌────────────┴────────────┐
     │                         │
     ▼                         ▼
GET /api/debug/poll       Is Complete?
  ?sessionId=xxx                │
     │                    ┌─────┴─────┐
     │                    │           │
     ▼                   Yes         No
Return Status              │           │
{                          ▼           ▼
  status: "processing",  Stop      Continue
  progress: 60%        Polling     Polling
}                          │
                          ▼
                   ┌──────────────┐
                   │ Display       │
                   │ Final Results │
                   └──────────────┘
```

---

## Deployment Flow

### CI/CD Pipeline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       DEPLOYMENT FLOW                                    │
└─────────────────────────────────────────────────────────────────────────┘

DEVELOPER
  │
  ▼
git commit -m "feature"
  │
  ▼
git push origin main
  │
  ▼
┌──────────────────────────────────────┐
│  GitHub Repository                   │
│  - Webhook triggers                   │
└─────────────────┬────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────┐
│  Vercel Platform                     │
│  1. Clone repository                  │
│  2. Install dependencies              │
│  3. Build Next.js app                 │
│  4. Run TypeScript checks             │
│  5. Deploy to edge network            │
└─────────────────┬────────────────────┘
                  │
     ┌────────────┼────────────┐
     │            │            │
     ▼            ▼            ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│Preview  │  │Staging  │  │Production│
│Branch   │  │Branch   │  │  main   │
└─────────┘  └─────────┘  └─────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Live Application│
                    │  - Edge deployed  │
                    │  - Auto-scaled    │
                    │  - CDN cached     │
                    └──────────────────┘
```

---

## Summary

This flow documentation covers:
✅ **User Journey** - Complete user interaction paths
✅ **Multi-Agent Workflow** - Detailed AI agent pipeline
✅ **Code Execution** - Simple and complex execution flows
✅ **Repository Analysis** - GitHub project analyzer workflow
✅ **Authentication** - Login, signup, and session management
✅ **Error Handling** - Comprehensive error management
✅ **State Management** - Application state flow
✅ **Polling** - Real-time update mechanism
✅ **Deployment** - CI/CD pipeline

Each flow diagram shows the complete path from user action to system response with detailed intermediate steps.
