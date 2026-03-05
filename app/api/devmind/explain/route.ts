// ─── DevMind Code Explain API ────────────────────────────────
// POST /api/devmind/explain
// Provides personalized, section-by-section code explanations.

import { NextRequest, NextResponse } from 'next/server';
import { explainCode } from '@/lib/devmind/llm/chain';
import { callGateway } from '@/lib/devmind/aws/gateway';

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

    console.log(`[API/explain] Request: lang=${language}, userId=<redacted>, codeLen=${code.length}`);

    // ── Try AWS Gateway first (Bedrock + DynamoDB cache) ──
    const gwResponse = await callGateway({
      userId, language, code, actionType: 'explain',
    });

    if (gwResponse?.success && gwResponse.data) {
      const d = gwResponse.data;
      console.log(`[API/explain] AWS Gateway hit (cached: ${gwResponse.meta?.cached}, model: ${gwResponse.meta?.modelUsed})`);
      return NextResponse.json({
        success: true,
        explanation: {
          title: (d.title as string) || 'Code Explanation',
          overview: (d.overview as string) || (d.analysis as string) || '',
          sections: Array.isArray(d.sections) ? (d.sections as Array<Record<string, unknown>>).map((s) => ({
            lineRange: s.lineRange || '',
            code: s.code || '',
            explanation: s.explanation || '',
            concept: s.concept || '',
            difficulty: s.difficulty || 'medium',
            relatedWeakness: null,
          })) : [],
          complexity: 'intermediate' as const,
          keyConcepts: Array.isArray(d.keyConcepts) ? d.keyConcepts as string[] : [],
          personalNotes: [],
        },
        personalizedTips: [],
        meta: gwResponse.meta,
      });
    }

    // ── Fallback: local Groq pipeline ──
    console.log('[API/explain] Falling back to local Groq pipeline');
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
