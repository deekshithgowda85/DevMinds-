# E2B Template Setup

This directory contains the E2B template configuration for the browser automation sandbox.

## Build and Deploy Template

### Option 1: Using E2B CLI (Recommended)

1. Install E2B CLI:

```bash
npm install -g @e2b/cli
```

2. Login to E2B:

```bash
e2b login
```

3. Build and push template from this directory:

```bash
cd e2b
e2b template build
```

4. Get your template ID:

```bash
e2b template list
```

5. Update the sandbox.ts file with your template ID.

### Option 2: Use Base Template (For Quick Testing)

The code is already configured to use the base E2B template with runtime installation of Playwright.

## Files

- `Dockerfile` - Defines the sandbox environment with Chromium and Playwright
- `e2b.toml` - E2B template configuration
- `browser.py` - Python script for browser control (optional, for advanced usage)
- `sandbox.ts` - TypeScript client for sandbox management

## Template Contents

- Ubuntu 22.04 base
- Python 3.11
- Playwright 1.45.0
- Chromium browser with all dependencies
- System fonts and libraries for headless rendering

## Usage

Once the template is built and deployed, update `e2b/sandbox.ts`:

```typescript
this.sandbox = await Sandbox.create({
  template: "your-template-id-here", // Replace with your template ID
  apiKey: process.env.E2B_API_KEY,
  timeout: 300000,
});
```
