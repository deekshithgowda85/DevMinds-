# 🏗️ Multi-Agent Debugger Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER (Next.js Frontend)                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Landing    │  │  Code Editor │  │   Services   │  │  My Projects │   │
│  │     Page     │  │    /editor   │  │   /services  │  │ /my-projects │   │
│  │   (Hero)     │  │              │  │              │  │              │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │                  │            │
│         └──────────────────┴──────────────────┴──────────────────┘            │
│                                      │                                        │
│                      ┌───────────────┴───────────────┐                       │
│                      │    Shared Components Layer     │                       │
│                      │  - Monaco Editor               │                       │
│                      │  - ReactFlow Graph             │                       │
│                      │  - Auth Components             │                       │
│                      │  - UI Components (shadcn)      │                       │
│                      └───────────────┬───────────────┘                       │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
                        ┌──────────────┴──────────────┐
                        │      MIDDLEWARE LAYER        │
                        │   - NextAuth.js              │
                        │   - API Route Handlers       │
                        │   - Error Boundaries         │
                        └──────────────┬──────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                          API LAYER (Next.js App Router)                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │ /api/debug/*    │  │ /api/sandbox/*  │  │ /api/analyze-*  │             │
│  │                 │  │                 │  │                 │             │
│  │ - analyze       │  │ - execute       │  │ - code          │             │
│  │ - trigger       │  │ - files         │  │ - project       │             │
│  │ - poll          │  │ - git           │  │                 │             │
│  │ - agent         │  │ - terminal      │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                     │                     │                      │
│           └─────────────────────┴─────────────────────┘                      │
│                                 │                                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐             │
│  │  /api/auth/*    │  │ /api/projects   │  │  /api/stats     │             │
│  │                 │  │                 │  │                 │             │
│  │ - [...nextauth] │  │ - CRUD ops      │  │ - Analytics     │             │
│  │ - signup        │  │                 │  │                 │             │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘             │
│           │                     │                     │                      │
└───────────┼─────────────────────┼─────────────────────┼─────────────────────┘
            │                     │                     │
            │                     │                     │
┌───────────┼─────────────────────┼─────────────────────┼─────────────────────┐
│                          SERVICE LAYER (lib/)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │ E2B Sandbox      │  │ Gemini Client    │  │ Git Client       │          │
│  │ Manager          │  │                  │  │                  │          │
│  │                  │  │ - Code analysis  │  │ - Clone repos    │          │
│  │ - executeCode()  │  │ - AI suggestions │  │ - Commit/Push    │          │
│  │ - runCommand()   │  │ - Error fixes    │  │ - Pull changes   │          │
│  │ - cloneRepo()    │  │                  │  │                  │          │
│  │ - listFiles()    │  │                  │  │                  │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                      │                      │                    │
│           └──────────────────────┴──────────────────────┘                    │
│                                  │                                           │
│                    ┌─────────────┴───────────────┐                          │
│                    │   Orchestrator Service       │                          │
│                    │   - Workflow management      │                          │
│                    │   - Agent coordination       │                          │
│                    │   - State management         │                          │
│                    └─────────────┬───────────────┘                          │
│                                  │                                           │
└──────────────────────────────────┼───────────────────────────────────────────┘
                                   │
┌──────────────────────────────────┼───────────────────────────────────────────┐
│                      AGENT LAYER (Inngest Functions)                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   Scanner    │  │  Validator   │  │    Fixer     │  │ File Writer  │   │
│  │    Agent     │  │    Agent     │  │    Agent     │  │    Agent     │   │
│  │              │  │              │  │              │  │              │   │
│  │ - Scan code  │  │ - Validate   │  │ - Generate   │  │ - Write to   │   │
│  │ - Find bugs  │  │   fixes      │  │   fixes      │  │   sandbox    │   │
│  │ - Analyze    │  │ - Test fixes │  │ - AI powered │  │ - Update     │   │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘   │
│         │                  │                  │                  │            │
│         └──────────────────┴──────────────────┴──────────────────┘            │
│                                      │                                        │
│                      ┌───────────────┴───────────────┐                       │
│                      │   Orchestrator Agent           │                       │
│                      │   - Coordinates all agents     │                       │
│                      │   - Manages workflow steps     │                       │
│                      │   - Handles async execution    │                       │
│                      └───────────────┬───────────────┘                       │
└──────────────────────────────────────┼─────────────────────────────────────┘
                                       │
┌──────────────────────────────────────┼─────────────────────────────────────┐
│                      EXTERNAL SERVICES LAYER                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │     E2B      │  │  Gemini AI   │  │   Supabase   │  │   Inngest    │   │
│  │   Sandbox    │  │              │  │              │  │              │   │
│  │              │  │ - Flash 2.0  │  │ - PostgreSQL │  │ - Workflow   │   │
│  │ - Code exec  │  │ - Analysis   │  │ - Auth       │  │   Engine     │   │
│  │ - Container  │  │ - Fixes      │  │ - Storage    │  │ - Events     │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

```
┌──────────────┐
│     User     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────┐
│           Frontend (Next.js Pages)               │
│                                                  │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐│
│  │   Editor   │  │  Services  │  │  Projects  ││
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘│
└────────┼───────────────┼───────────────┼────────┘
         │               │               │
         ▼               ▼               ▼
┌─────────────────────────────────────────────────┐
│              API Routes Layer                    │
│                                                  │
│  POST /api/debug/analyze                        │
│  POST /api/analyze-project                      │
│  POST /api/sandbox/execute                      │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│           Service Orchestrator                   │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │  1. Initialize E2B Sandbox              │   │
│  │  2. Execute/Analyze code                │   │
│  │  3. Trigger Inngest workflow (if AI)    │   │
│  │  4. Return results                      │   │
│  └─────────────────────────────────────────┘   │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│         Inngest Workflow (Multi-Agent)          │
│                                                  │
│  Step 1: Scanner Agent                          │
│     │                                            │
│     ▼                                            │
│  Step 2: Validator Agent                        │
│     │                                            │
│     ▼                                            │
│  Step 3: Fixer Agent                            │
│     │                                            │
│     ▼                                            │
│  Step 4: File Writer Agent                      │
│                                                  │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│          External Services                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │   E2B    │  │  Gemini  │  │ Supabase │      │
│  │ Sandbox  │  │    AI    │  │    DB    │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└──────────────────────────────────────────────────┘
```

## Data Flow

### 1. Simple Execution (No AI)

```
User → Editor → /api/sandbox/execute
                      ↓
              E2B Sandbox Manager
                      ↓
              Execute Code in E2B
                      ↓
              Return Output → User
```

### 2. AI-Powered Debug Flow

```
User → Editor → /api/debug/analyze
                      ↓
              Inngest Trigger Event
                      ↓
        ┌─────────────────────────────┐
        │   Multi-Agent Workflow      │
        │                             │
        │  1. Scanner (Gemini AI)     │
        │     ↓                       │
        │  2. Validator (Gemini AI)   │
        │     ↓                       │
        │  3. Fixer (Gemini AI)       │
        │     ↓                       │
        │  4. Writer (E2B Sandbox)    │
        └─────────────┬───────────────┘
                      ↓
              Results → Supabase
                      ↓
              Poll API → User
```

### 3. Project Analysis Flow

```
User → Services → /api/analyze-project
                      ↓
              E2B Sandbox: Clone Repo
                      ↓
              Parse File Structure
                      ↓
              Analyze Dependencies
                      ↓
              Generate Graph Data
                      ↓
              ReactFlow Visualization → User
```

## Technology Stack Layers

```
┌─────────────────────────────────────────────────┐
│              Presentation Layer                  │
│  - Next.js 16.1.0 (App Router)                  │
│  - React 19                                     │
│  - TypeScript 5.x                               │
│  - Tailwind CSS                                 │
│  - shadcn/ui Components                         │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Business Logic Layer                │
│  - Monaco Editor (Code editing)                 │
│  - ReactFlow (Graph visualization)              │
│  - NextAuth.js (Authentication)                 │
│  - Custom API Routes                            │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Integration Layer                   │
│  - E2B SDK v2.8.4                               │
│  - Gemini AI SDK                                │
│  - Supabase Client                              │
│  - Inngest SDK                                  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────┴───────────────────────────────┐
│              Infrastructure Layer                │
│  - E2B Cloud Sandboxes                          │
│  - Google Gemini AI (Flash 2.0)                 │
│  - Supabase (PostgreSQL + Auth)                 │
│  - Inngest (Workflow Engine)                    │
│  - Vercel (Hosting)                             │
└──────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────┐
│              Security Layers                     │
├─────────────────────────────────────────────────┤
│                                                  │
│  1. Authentication (NextAuth.js)                │
│     - Session management                        │
│     - JWT tokens                                │
│     - OAuth providers                           │
│                                                  │
│  2. Authorization (Middleware)                  │
│     - Route protection                          │
│     - API key validation                        │
│     - User permissions                          │
│                                                  │
│  3. Code Execution (E2B Sandbox)                │
│     - Isolated containers                       │
│     - Resource limits                           │
│     - Network isolation                         │
│     - 10-minute timeout                         │
│                                                  │
│  4. Data Protection (Supabase)                  │
│     - Row-level security                        │
│     - Encrypted connections                     │
│     - API key rotation                          │
│                                                  │
│  5. Environment Variables                       │
│     - Server-side only secrets                  │
│     - .env.local (not committed)                │
│     - Vercel environment config                 │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Scalability Considerations

### Horizontal Scaling

- **Frontend**: Vercel Edge Network (global CDN)
- **API Routes**: Serverless functions (auto-scale)
- **Agents**: Inngest parallel execution
- **Sandboxes**: E2B cloud infrastructure

### Resource Management

- **E2B Sandboxes**: 10-minute timeout, auto-cleanup
- **API Rate Limiting**: Per-user quotas
- **Database Connections**: Supabase connection pooling
- **Cache Strategy**: React Query for client-side caching

### Performance Optimization

- **Code Splitting**: Next.js automatic code splitting
- **Lazy Loading**: React.lazy for heavy components
- **Image Optimization**: Next.js Image component
- **API Response**: Streaming for large outputs

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│              Vercel Platform                     │
│                                                  │
│  ┌────────────────────────────────────────┐    │
│  │     Next.js Application                │    │
│  │     (Edge Functions)                   │    │
│  └─────────────┬──────────────────────────┘    │
│                │                                 │
│  ┌─────────────┴──────────────────────────┐    │
│  │     Static Assets (CDN)                │    │
│  └────────────────────────────────────────┘    │
│                                                  │
└─────┬───────────────────────────────────────────┘
      │
      ├──────────────────────────────────────┐
      │                                      │
      ▼                                      ▼
┌─────────────────┐              ┌─────────────────┐
│  External APIs  │              │   Supabase DB   │
│                 │              │                 │
│  - E2B Sandbox  │              │  - PostgreSQL   │
│  - Gemini AI    │              │  - Auth         │
│  - Inngest      │              │  - Storage      │
└─────────────────┘              └─────────────────┘
```

## File Structure by Responsibility

### Frontend Components

- `app/page.tsx` - Landing page
- `app/editor/page.tsx` - Code editor
- `app/services/page.tsx` - Project analyzer
- `components/ui/*` - Reusable UI components

### API Layer

- `app/api/debug/*` - Debug workflow APIs
- `app/api/sandbox/*` - Sandbox operations
- `app/api/analyze-*` - Analysis endpoints
- `app/api/auth/*` - Authentication

### Service Layer

- `lib/e2b-sandbox.ts` - E2B wrapper
- `lib/gemini-client.ts` - AI client
- `lib/orchestrator.ts` - Workflow manager
- `lib/git-client.ts` - Git operations

### Agent Layer

- `lib/inngest/agents/scanner.ts` - Code scanner
- `lib/inngest/agents/validator.ts` - Fix validator
- `lib/inngest/agents/fixer.ts` - Code fixer
- `lib/inngest/agents/file-writer.ts` - File writer

### Configuration

- `sandbox/codedebugger/*` - E2B template
- `supabase/migrations/*` - Database schema
- `.env.local` - Environment variables
