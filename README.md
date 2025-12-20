# Multi-Agent Code Debugger

An intelligent code debugging platform powered by AI that uses multiple agents to scan, fix, and validate code automatically.

## Features

- 🤖 **AI-Powered Analysis**: Uses Google Gemini AI for intelligent code analysis
- 🔍 **Multi-Agent System**: Scanner, Fixer, and Validator agents work together
- 💻 **Code Editor**: Built-in Monaco editor with syntax highlighting
- 🐛 **Automatic Bug Detection**: Finds syntax errors, style issues, and potential bugs
- ✨ **Smart Fixes**: AI-generated code corrections with explanations
- 📊 **Real-time Feedback**: See changes as they're analyzed and fixed
- 🌐 **Multi-Language Support**: JavaScript, TypeScript, Python, Java, C++, and more

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Gemini AI (Optional but Recommended)

For AI-powered analysis, you need a Google Gemini API key:

1. Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a `.env.local` file in the root directory:

```env
GEMINI_API_KEY=your_api_key_here
```

**Note**: Without Gemini, the debugger will use pattern-based analysis (basic fixes like var→const, semicolons).

For detailed setup instructions, see [GEMINI_SETUP.md](GEMINI_SETUP.md)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. **Open the Editor**: Navigate to `/editor`
2. **Write or Paste Code**: Use the built-in Monaco editor
3. **Start Debug**: Click "Start Debug" to analyze your code
4. **Review Results**: See errors, proposed fixes, and suggestions
5. **Apply Fixes**: Click "Apply Fix" to update your code automatically

## How It Works

The Multi-Agent Debugger uses a workflow system:

1. **Scanner Agent** 🔍

   - Analyzes code using Gemini AI or pattern matching
   - Identifies errors, warnings, and potential issues
   - Categorizes problems by severity

2. **Fixer Agent** 🔧

   - Generates fixes based on identified issues
   - Uses AI to understand context and intent
   - Proposes line-by-line corrections

3. **Validator Agent** ✅
   - Reviews proposed fixes
   - Ensures changes don't break functionality
   - Provides confidence scores and suggestions

## Technologies

- **Next.js 14** - React framework
- **TypeScript** - Type-safe JavaScript
- **Monaco Editor** - VS Code-powered editor
- **Google Gemini AI** - Advanced code analysis
- **Inngest** - Workflow orchestration
- **E2B Sandbox** - Remote code execution
- **Tailwind CSS** - Styling

## Environment Variables

Create a `.env.local` file with:

```env
# Required for AI-powered analysis
GEMINI_API_KEY=your_gemini_api_key

# Required for authentication
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000

# Required for Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Required for E2B Sandbox
E2B_API_KEY=your_e2b_api_key
```

## Documentation

- [Gemini Setup Guide](GEMINI_SETUP.md) - Detailed Gemini AI configuration
- [Authentication Guide](AUTHENTICATION.md) - User authentication setup

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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
