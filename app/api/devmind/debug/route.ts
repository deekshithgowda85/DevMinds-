// ─── DevMind CodeTrace Debug API ─────────────────────────────
// POST /api/devmind/debug
// Analyzes code + error with memory-aware AI debugging.

import { NextRequest, NextResponse } from 'next/server';
import { debugWithMemory } from '@/lib/devmind/llm/chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields with runtime type checks
    const { userId, language, code, errorMessage } = body as Record<string, unknown>;

    if (
      typeof userId !== 'string' ||
      typeof language !== 'string' ||
      typeof code !== 'string' ||
      typeof errorMessage !== 'string' ||
      !userId.trim() ||
      !language.trim() ||
      !code.trim() ||
      !errorMessage.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid required fields: userId, language, code, errorMessage (all must be non-empty strings)',
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

    // Run the full debug pipeline (sanitized log — no user content)
    console.log(`[API/debug] Request: lang=${language}, userId=<redacted>, errorLen=${errorMessage.length}`);

    const result = await debugWithMemory({
      userId,
      language,
      code,
      errorMessage,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('[API/debug] Internal error occurred');

    return NextResponse.json(
      { success: false, error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
