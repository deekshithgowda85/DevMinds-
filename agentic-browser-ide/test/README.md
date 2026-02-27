# Test Scripts

This folder contains test scripts to verify the functionality of the E2B sandbox and browser automation.

## Prerequisites

- Ensure you have the `E2B_API_KEY` environment variable set.
- You should have `tsx` installed or use `npx tsx` to run these scripts.

## Running Tests

Run the scripts from the root directory of the project.

### 1. Test Sandbox Connection

Verifies that we can connect to E2B and create a sandbox.

```bash
npx tsx test/test-sandbox-connection.ts
```

### 2. Test Browser Installation

Verifies that the browser environment (Playwright/Chromium) is correctly set up inside the sandbox.

```bash
npx tsx test/test-browser-installed.ts
```

### 3. Test Screenshot

Navigates to a website, takes a screenshot, and saves it locally as `screenshot.png` to verify WebRTC/Visuals are working.

```bash
npx tsx test/test-screenshot.ts
```

### 4. General Test Scenario

A generic test script for other verification needs.

```bash
npx tsx test/test-general.ts
```
