# Agentic Browser IDE

A **single-page Agentic IDE** where an AI agent controls a real browser in an isolated sandbox, streams it live to your UI, and responds to natural language commands.

## 🎯 Features

- **AI-Controlled Browser**: Real Chromium browser running in E2B sandbox
- **Natural Language Control**: Tell the agent what to do in plain English
- **Live Streaming**: See the browser in real-time
- **Event-Driven Architecture**: Inngest orchestrates every step
- **Isolated Execution**: All browser actions run in E2B sandbox

## 🏗️ Architecture

```
USER MESSAGE
  ↓
INTENT PARSER (Agent Planner)
  ↓
STEP PLANNER
  ↓
INNGEST EVENT
  ↓
E2B BROWSER ACTION (Playwright)
  ↓
STREAM UPDATE (Screenshots)
  ↓
OBSERVATION
  ↓
NEXT STEP OR FINISH
```

## 🧱 Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Agent Orchestration**: Inngest (event-driven workflows)
- **Browser Sandbox**: E2B + Playwright + Chromium
- **Streaming**: Screenshot-based updates (WebRTC ready for enhancement)

## 📂 Project Structure

```
agentic-browser-ide/
├─ app/
│  ├─ page.tsx                 # Main UI (chat + browser stream)
│  ├─ api/
│  │  ├─ inngest/              # Inngest event endpoint
│  │  ├─ agent/                # Agent task & status
│  │  ├─ sandbox/              # Sandbox initialization
│  │  └─ stream/               # Streaming endpoint
├─ components/
│  ├─ ChatPanel.tsx            # Left panel (1/4 width)
│  └─ BrowserStream.tsx        # Right panel (3/4 width)
├─ agent/
│  ├─ planner.ts               # Converts intent → steps
│  ├─ executor.ts              # Executes browser actions
│  ├─ observer.ts              # Captures browser state
│  └─ state.ts                 # State management
├─ inngest/
│  ├─ client.ts                # Inngest client
│  └─ functions.ts             # Event-driven task execution
├─ e2b/
│  ├─ sandbox.ts               # E2B sandbox manager
│  ├─ browser.py               # Playwright browser controller
│  └─ Dockerfile               # Docker config for E2B
├─ streaming/
│  ├─ webrtc.ts                # WebRTC streaming setup
│  └─ ffmpeg.ts                # FFmpeg screen capture
└─ lib/
   ├─ types.ts                 # TypeScript types
   └─ constants.ts             # App constants
```

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 18+ and npm
- E2B account (get API key from [e2b.dev](https://e2b.dev))

### 2. Installation

```bash
# Clone or navigate to project
cd agentic-browser-ide

# Install dependencies
npm install
```

### 3. Configure Environment

Edit `.env.local`:

```env
E2B_API_KEY=your_e2b_api_key_here
INNGEST_EVENT_KEY=local-dev-key
INNGEST_SIGNING_KEY=local-dev-signing-key
```

> **Note**: For local development, Inngest keys can use the default values. E2B API key is required - sign up at https://e2b.dev

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Start Using the Agent

Example commands you can try:

- `"Go to google.com"`
- `"Search for AI agents"`
- `"Navigate to example.com"`
- `"Scroll down"`
- `"Click the search button"`

## 🧠 How It Works

### Agent Components

1. **Planner** (`agent/planner.ts`)
   - Parses natural language intent
   - Generates executable step plan
   - Handles common patterns (search, navigate, click, type)

2. **Executor** (`agent/executor.ts`)
   - Executes each step via E2B sandbox
   - Handles retries with exponential backoff
   - Reports success/failure

3. **Observer** (`agent/observer.ts`)
   - Captures browser state (URL, title, ready status)
   - Takes screenshots
   - Validates execution success

4. **State** (`agent/state.ts`)
   - Manages task and step state
   - Tracks progress through plans
   - Updates step status

### Event Flow (Inngest)

```typescript
1. User sends message → API creates task
2. Inngest receives TASK_STARTED event
3. Planner creates step-by-step plan
4. Executor runs each step in sequence
5. Observer captures browser state after each step
6. UI polls for updates and displays progress
7. TASK_COMPLETED event when done
```

### E2B Sandbox

The browser runs in an isolated E2B sandbox with:

- Python 3.11
- Playwright installed
- Chromium browser
- No external network access to your machine
- Automatically cleaned up after use

### Browser Control (Python Script)

The `e2b/browser.py` script runs inside the sandbox:

- Receives commands via stdin (JSON)
- Controls Playwright browser
- Returns results via stdout (JSON)
- Supports: navigate, click, type, scroll, screenshot

## 🔧 Configuration

### Browser Settings

Edit `lib/constants.ts`:

```typescript
BROWSER: {
  VIEWPORT: { width: 1280, height: 720 },
  TIMEOUT: 30000,
}
```

### Agent Settings

```typescript
AGENT: {
  MAX_STEPS: 20,       // Max steps per task
  MAX_RETRIES: 3,      // Retries per step
}
```

## 📡 API Endpoints

### `POST /api/sandbox/init`

Initialize E2B sandbox and browser

### `POST /api/agent/task`

Create new agent task

```json
{
  "taskId": "uuid",
  "intent": "Search for cats"
}
```

### `GET /api/agent/status?taskId=xxx`

Get task status, browser state, and screenshot

### `POST /api/stream`

WebRTC signaling (for future real-time streaming)

## 🐛 Troubleshooting

### "Sandbox not initialized"

- Check E2B_API_KEY in `.env.local`
- Verify E2B account is active
- Check console for initialization errors

### "Browser action failed"

- Browser may need more time to load
- Increase timeout in constants
- Check selector syntax

### "No screenshot available"

- Browser may not be ready
- Wait for page to load
- Check browser state in status API

## 🚧 Development Roadmap

- [ ] Real-time WebRTC streaming (currently screenshot-based)
- [ ] Enhanced AI planning with GPT-4
- [ ] Multi-tab browser support
- [ ] Browser interaction recording/playback
- [ ] Custom browser profiles
- [ ] Session persistence

## 📝 Environment Variables Reference

| Variable              | Required | Description                      | Default                 |
| --------------------- | -------- | -------------------------------- | ----------------------- |
| `E2B_API_KEY`         | Yes      | E2B API key for sandbox          | -                       |
| `INNGEST_EVENT_KEY`   | No       | Inngest event key                | `local-dev-key`         |
| `INNGEST_SIGNING_KEY` | No       | Inngest signing key              | `local-dev-signing-key` |
| `OPENAI_API_KEY`      | No       | OpenAI API for enhanced planning | -                       |

## 🤝 Contributing

This is a demonstration project. Feel free to fork and extend!

## 📄 License

MIT

## 🔗 Links

- [E2B Documentation](https://e2b.dev/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Playwright Documentation](https://playwright.dev)
- [Next.js Documentation](https://nextjs.org/docs)

---

Built with ❤️ using Next.js, E2B, Inngest, and Playwright

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
