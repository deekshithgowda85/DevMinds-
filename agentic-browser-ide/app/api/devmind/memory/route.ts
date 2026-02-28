// ─── DevMind Memory API ──────────────────────────────────────
// GET /api/devmind/memory?userId=xxx
// Returns user's debug history, learning metrics, and memory stats.

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/devmind/database/postgres';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required query parameter: userId' },
        { status: 400 }
      );
    }

    // Fetch data in parallel
    const [recentSessions, learningMetrics, totalCount] = await Promise.all([
      prisma.debugSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          language: true,
          codeSnippet: true,
          errorMessage: true,
          errorType: true,
          conceptGap: true,
          explanation: true,
          fix: true,
          confidenceLevel: true,
          createdAt: true,
        },
      }),
      prisma.learningMetric.findUnique({
        where: { userId },
      }),
      prisma.debugSession.count({
        where: { userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      userId,
      totalSessions: totalCount,
      recentSessions,
      learningMetrics: learningMetrics
        ? {
            totalSessions: learningMetrics.totalSessions,
            recurringMistakes: learningMetrics.recurringMistakes,
            conceptWeaknesses: learningMetrics.conceptWeaknesses,
            improvementMetrics: learningMetrics.improvementMetrics,
            lastCalculated: learningMetrics.lastCalculated,
          }
        : null,
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
