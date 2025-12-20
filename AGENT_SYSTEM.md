# AI Agent System Implementation

## Overview

The Multi-Agent Debugger now uses **@inngest/agent-kit** with **Gemini AI** to provide intelligent code analysis, debugging, and fixing through autonomous AI agents.

## Architecture

### Components

#### 1. **Debug Agent** (`lib/inngest/agents/debug-agent.ts`)

- **Purpose**: Analyzes code and generates fixes using AI
- **Event**: `debug/analyze`
- **Tools**:
  - `analyzeCode`: Identifies errors, warnings, and issues
  - `generateFixes`: Creates specific line-by-line fixes
  - `generateFixedCode`: Produces complete, working code
  - `completeDebug`: Finalizes the debug process

#### 2. **Code Editor Agent** (`lib/inngest/agents/code-editor-agent.ts`)

- **Purpose**: Comprehensive code editing with AI-powered modifications
- **Event**: `code-editor/fix`
- **Tools**:
  - `analyzeCode`: Deep code analysis
  - `planModifications`: Plans what changes to make
  - `generateFixedCode`: Creates complete fixed code
  - `saveResult`: Finalizes the editing process

### How It Works

```
User Code → AI Agent Network → Tool Calls → Fixed Code
     ↓            ↓                ↓             ↓
  Original    Gemini AI      analyzeCode    Complete
   Code       (gemini-       generateFixes  Working
              2.0-flash)     fixedCode      Code
```

### Agent Workflow

1. **Initialization**: Agent receives code and language
2. **Analysis Phase**: Agent uses `analyzeCode` tool to identify issues
3. **Planning Phase**: Agent determines what fixes are needed
4. **Fix Generation**: Agent creates complete, working code
5. **Finalization**: Results are returned to the frontend

## API Endpoints

### `/api/debug/agent` (POST)

Triggers the debug agent for code analysis and fixing.

**Request:**

```json
{
  "code": "string",
  "language": "cpp|javascript|python|java|typescript",
  "filepath": "string (optional)",
  "sessionId": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "eventId": "event_xxx",
  "message": "Debug agent workflow started"
}
```

### `/api/code-editor/agent` (POST)

Triggers the code editor agent for comprehensive code editing.

**Request/Response:** Same as debug agent

### `/api/debug/analyze` (POST)

Direct Gemini API call for immediate results (used while agents work).

**Response:**

```json
{
  "success": true,
  "analysis": {
    "errors": [...],
    "fixes": [...],
    "fixedCode": "string",
    "suggestions": [...]
  }
}
```

## Language-Specific Requirements

The agents are configured with strict requirements for each language:

### C++

- ✅ MUST have `int main()` function
- ✅ MUST include headers (`#include <iostream>`)
- ✅ MUST use `std::` prefix
- ✅ All semicolons in place
- ✅ Code MUST compile

### Python

- ✅ PEP 8 compliance
- ✅ Type hints
- ✅ 4-space indentation
- ✅ Proper imports

### Java

- ✅ `public static void main(String[] args)`
- ✅ Proper class definition
- ✅ Import statements
- ✅ Java naming conventions

### JavaScript/TypeScript

- ✅ Modern syntax (const/let)
- ✅ Arrow functions
- ✅ Proper semicolons
- ✅ === instead of ==

## Environment Variables

### Required

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your key from: https://makersuite.google.com/app/apikey

### Optional

```env
INNGEST_EVENT_KEY=your_inngest_key # For Inngest Cloud
```

## Frontend Integration

The editor page now uses AI agents:

```typescript
// Trigger AI Agent
const response = await fetch("/api/code-editor/agent", {
  method: "POST",
  body: JSON.stringify({ code, language, filepath, sessionId }),
});

// Get immediate results via Gemini API
const analysisResponse = await fetch("/api/debug/analyze", {
  method: "POST",
  body: JSON.stringify({ code, language }),
});
```

## Agent Network Configuration

```typescript
const network = createNetwork<AgentState>({
  name: "code-editor-network",
  agents: [codeEditorAgent],
  maxIter: 15, // Maximum tool calls
  defaultState: state,
  router: async ({ network }) => {
    // Stop if work is complete
    if (network.state.data.summary) {
      return;
    }
    return codeEditorAgent;
  },
});
```

## Monitoring & Debugging

### Console Logs

All agent activity is logged:

- `[Code Editor Agent] Starting...`
- `[Code Editor Agent] Found X issues`
- `[Code Editor Agent] Planned X modifications`
- `[Code Editor Agent] Generated fixed code`

### Inngest Dev Server

View real-time agent execution at: http://localhost:3000/api/inngest

### Progress Indicators

The frontend shows agent progress:

1. 🤖 **Agent Working**: AI analyzing code
2. 🔍 **Analyzing**: Identifying issues
3. 📝 **Planning**: Planning modifications
4. ⚡ **Fixing**: Generating fixed code
5. ✅ **Complete**: Work finished

## Testing the Agents

### 1. Start Dev Server

```bash
npm run dev
```

### 2. Open Editor

Navigate to `/editor`

### 3. Write Code with Errors

Example C++ code:

```cpp
void hello() {
    cout << "Hello"
}
```

### 4. Click "Start Multi-Agent Debug"

Watch the agent:

- Analyze the code
- Identify missing `main()`, `#include`, `std::`, semicolon
- Generate complete working code

### 5. Click "Apply Fixes"

Fixed code is applied to the editor

### 6. Click "Run"

Code executes successfully in E2B sandbox

## Advantages of Agent System

### 🚀 **Intelligent Fixes**

- AI understands context
- No hardcoded patterns
- Adapts to any language

### 🎯 **Complete Solutions**

- Adds missing boilerplate
- Fixes syntax and logic
- Ensures compilability

### 🔄 **Self-Correcting**

- Agent can retry if needed
- Uses tools iteratively
- Learns from mistakes

### 📊 **Transparent Process**

- Tool calls are logged
- Progress is visible
- Results are explainable

## Troubleshooting

### "Gemini AI analysis failed"

- ✅ Check GEMINI_API_KEY in `.env.local`
- ✅ Restart the dev server: `npm run dev`
- ✅ Verify API key at: https://makersuite.google.com/app/apikey

### "Agent timeout"

- ✅ Increase `maxIter` in agent network config
- ✅ Simplify code being analyzed
- ✅ Check Inngest dev server logs

### "Code not fixed properly"

- ✅ Check console logs for agent tool calls
- ✅ Verify language detection is correct
- ✅ Try running debug again (agent learns)

## Next Steps

### 🔮 Future Enhancements

1. **Result Polling**: Poll Inngest API for agent results
2. **Multi-File Support**: Agent edits multiple files
3. **Interactive Fixing**: User guides agent decisions
4. **Custom Prompts**: User-defined agent instructions
5. **Agent Memory**: Remember previous fixes

### 🛠️ Extension Points

- Add more tools for agents
- Create specialized agents (security, performance)
- Integrate with E2B sandbox for live testing
- Add streaming responses for real-time feedback

## Dependencies

```json
{
  "@inngest/agent-kit": "^latest",
  "inngest": "^3.48.1",
  "zod": "^latest"
}
```

## Resources

- **Inngest Agent Kit**: https://www.inngest.com/docs/agent-kit
- **Gemini API**: https://ai.google.dev/docs
- **E2B Sandbox**: https://e2b.dev/docs

---

**Built with ❤️ using Inngest Agent Kit + Gemini AI**
