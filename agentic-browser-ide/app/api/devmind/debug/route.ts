// ─── DevMind CodeTrace Debug API ─────────────────────────────
// POST /api/devmind/debug
// Analyzes code + error with memory-aware AI debugging.

import { NextRequest, NextResponse } from 'next/server';
import { debugWithMemory } from '@/lib/devmind/llm/chain';
import type { DebugRequest } from '@/lib/devmind/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const { userId, language, code, errorMessage } = body as Partial<DebugRequest>;

    if (!userId || !language || !code || !errorMessage) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: userId, language, code, errorMessage',
        },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (code.length > 10000) {
      return NextResponse.json(
        { success: false, error: 'Code snippet too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    if (errorMessage.length > 2000) {
      return NextResponse.json(
        { success: false, error: 'Error message too long (max 2,000 characters)' },
        { status: 400 }
      );
    }

    // Run the full debug pipeline
    console.log(`[API/debug] Request from ${userId}: ${language} — ${errorMessage.slice(0, 80)}`);

    const result = await debugWithMemory({
      userId,
      language,
      code,
      errorMessage,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[API/debug] Error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
