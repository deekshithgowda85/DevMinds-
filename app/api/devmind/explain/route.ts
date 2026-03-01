// ─── DevMind Code Explain API ────────────────────────────────
// POST /api/devmind/explain
// Provides personalized, section-by-section code explanations.

import { NextRequest, NextResponse } from 'next/server';
import { explainCode } from '@/lib/devmind/llm/chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields with runtime type checks
    const { userId, language, code } = body as Record<string, unknown>;

    if (
      typeof userId !== 'string' ||
      typeof language !== 'string' ||
      typeof code !== 'string' ||
      !userId.trim() ||
      !language.trim() ||
      !code.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or invalid required fields: userId, language, code (all must be non-empty strings)',
        },
        { status: 400 }
      );
    }

    // Validate field lengths
    if (code.length > 15000) {
      return NextResponse.json(
        { success: false, error: 'Code too long (max 15,000 characters)' },
        { status: 400 }
      );
    }

    // Run the explain pipeline (sanitized log)
    console.log(`[API/explain] Request: lang=${language}, userId=<redacted>, codeLen=${code.length}`);

    const result = await explainCode({
      userId,
      language,
      code,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API/explain] Error:', message);
    return NextResponse.json(
      { success: false, error: 'An internal error occurred' },
      { status: 500 }
    );
  }
}
