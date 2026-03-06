// ─── DevMind CodeTrace Debug API ─────────────────────────────
// POST /api/devmind/debug
// Analyzes code + error with memory-aware AI debugging.

import { NextRequest, NextResponse } from 'next/server';
import { debugWithMemory } from '@/lib/devmind/llm/chain';
import { callGateway } from '@/lib/devmind/aws/gateway';
import { storeDebugSession } from '@/lib/devmind/aws/sessions';

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

    console.log(`[API/debug] Request: lang=${language}, userId=<redacted>, errorLen=${errorMessage.length}`);

    // ── Try AWS Gateway first (Bedrock + DynamoDB cache) ──
    const gwResponse = await callGateway({
      userId, language, code, error: errorMessage, actionType: 'fix',
    });

    if (gwResponse?.success && gwResponse.data) {
      const d = gwResponse.data;
      const rawConf = typeof d.confidenceScore === 'number' ? d.confidenceScore : 0.5;
      // Normalize to 0-1 scale (consistent with Groq fallback)
      const confidenceLevel = rawConf > 1 ? rawConf / 100 : rawConf;
      console.log(`[API/debug] AWS Gateway hit (cached: ${gwResponse.meta?.cached}, model: ${gwResponse.meta?.modelUsed})`);

      // Store to DynamoDB for analytics (fire-and-forget)
      storeDebugSession({
        userId,
        language,
        errorType: (d.errorType as string) || 'Unknown',
        conceptGap: (d.conceptGap as string) || '',
        confidenceLevel,
        explanation: (d.analysis as string) || (d.fixExplanation as string) || '',
        fix: (d.suggestedFix as string) || '',
      }).catch((e: unknown) => console.warn('[API/debug] DynamoDB store failed:', e instanceof Error ? e.message : e));

      return NextResponse.json({
        success: true,
        result: {
          errorType: d.errorType || 'Unknown',
          detectedConceptGap: d.conceptGap || '',
          explanationSummary: d.analysis || d.fixExplanation || '',
          fix: d.suggestedFix || '',
          confidenceLevel,
          isRecurring: false,
          learningTip: d.learningTip || '',
          similarPastErrors: 0,
        },
        memoryStats: { totalSessions: 0, similarErrors: 0 },
        meta: gwResponse.meta,
      });
    }

    // ── Fallback: local Groq pipeline ──
    console.log('[API/debug] Falling back to local Groq pipeline');
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
