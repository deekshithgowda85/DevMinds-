// ─── DevMind Memory API ──────────────────────────────────────
// GET /api/devmind/memory?userId=xxx
// Returns user's debug history, learning metrics, and memory stats.

import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions } from '@/lib/devmind/aws/sessions';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: userId' },
        { status: 400 }
      );
    }

    // Fetch sessions from DynamoDB
    let sessions: Awaited<ReturnType<typeof getUserSessions>> = [];
    try {
      sessions = await getUserSessions(userId);
    } catch (e) {
      console.warn('[API/memory] DynamoDB fetch failed:', e instanceof Error ? e.message : e);
    }

    // Compute metrics from sessions
    const errorCounts: Record<string, number> = {};
    const conceptCounts: Record<string, number> = {};
    const confidenceHistory: number[] = [];

    sessions.forEach((s) => {
      errorCounts[s.errorType] = (errorCounts[s.errorType] || 0) + 1;
      if (s.conceptGap) {
        conceptCounts[s.conceptGap] = (conceptCounts[s.conceptGap] || 0) + 1;
      }
      confidenceHistory.push(s.confidenceLevel);
    });

    const avgConfidence = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.confidenceLevel, 0) / sessions.length
      : 0;

    const recentSessions = sessions.slice(-20).reverse().map((s, i) => ({
      id: `session-${i}`,
      language: s.language,
      errorType: s.errorType,
      conceptGap: s.conceptGap || null,
      confidenceLevel: s.confidenceLevel,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      success: true,
      userId,
      totalSessions: sessions.length,
      recentSessions,
      learningMetrics: sessions.length > 0 ? {
        totalSessions: sessions.length,
        recurringMistakes: Object.entries(errorCounts)
          .map(([errorType, count]) => ({ errorType, count }))
          .sort((a, b) => b.count - a.count),
        conceptWeaknesses: Object.entries(conceptCounts)
          .map(([concept, count]) => ({ concept, count }))
          .sort((a, b) => b.count - a.count),
        improvementMetrics: {
          avgConfidence,
          uniqueErrorTypes: Object.keys(errorCounts).length,
          confidenceHistory: confidenceHistory.slice(-20),
        },
      } : null,
    });
  } catch (error: unknown) {
    console.error('[API/memory] Error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
