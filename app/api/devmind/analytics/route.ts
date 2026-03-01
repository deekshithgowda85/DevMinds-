// ─── DevMind Analytics API ───────────────────────────────────
// GET /api/devmind/analytics — Aggregate learning analytics for charts

import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/devmind/database/postgres';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query param required' },
        { status: 400 }
      );
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({
        success: true,
        analytics: {
          summary: { totalSessions: 0, uniqueErrorTypes: 0, uniqueLanguages: 0, avgConfidence: 0, currentStreak: 0, maxStreak: 0, activeDays: 0 },
          errorDistribution: [], languageDistribution: [], confidenceTimeline: [], conceptGaps: [], dailyActivity: [], recurringMistakes: [], conceptWeaknesses: [],
        },
        notice: 'Database not configured. Add a valid DATABASE_URL to .env.local.',
      });
    }

    // Fetch all data in parallel
    const [sessions, metrics] = await Promise.all([
      prisma.debugSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      }).catch(() => []),
      prisma.learningMetric.findUnique({
        where: { userId },
      }).catch(() => null),
    ]);

    // ─── Error Type Distribution ───────────────────────
    const errorTypeCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      errorTypeCounts[s.errorType] = (errorTypeCounts[s.errorType] || 0) + 1;
    });
    const errorDistribution = Object.entries(errorTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Language Distribution ─────────────────────────
    const langCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      langCounts[s.language] = (langCounts[s.language] || 0) + 1;
    });
    const languageDistribution = Object.entries(langCounts)
      .map(([language, count]) => ({ language, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Confidence Over Time ──────────────────────────
    const confidenceTimeline = sessions.map((s, i) => ({
      session: i + 1,
      confidence: s.confidenceLevel,
      date: s.createdAt.toISOString().split('T')[0],
    }));

    // ─── Concept Gap Frequency ─────────────────────────
    const conceptCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.conceptGap) {
        conceptCounts[s.conceptGap] = (conceptCounts[s.conceptGap] || 0) + 1;
      }
    });
    const conceptGaps = Object.entries(conceptCounts)
      .map(([concept, count]) => ({ concept, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Daily Activity ────────────────────────────────
    const dailyCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = s.createdAt.toISOString().split('T')[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });
    const dailyActivity = Object.entries(dailyCounts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // ─── Streak Calculation ────────────────────────────
    let currentStreak = 0;
    let maxStreak = 0;
    const today = new Date();
    const dateSet = new Set(Object.keys(dailyCounts));
    
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      if (dateSet.has(key)) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else if (i > 0) {
        break; // Streak broken
      }
    }

    // ─── Summary Stats ─────────────────────────────────
    const avgConfidence =
      sessions.length > 0
        ? Math.round(sessions.reduce((sum, s) => sum + s.confidenceLevel, 0) / sessions.length)
        : 0;

    const recurringMistakes = Array.isArray(metrics?.recurringMistakes)
      ? (metrics.recurringMistakes as Array<{ errorType: string; count: number }>)
      : [];

    const conceptWeaknesses = Array.isArray(metrics?.conceptWeaknesses)
      ? (metrics.conceptWeaknesses as Array<{ concept: string; count: number }>)
      : [];

    return NextResponse.json({
      success: true,
      analytics: {
        summary: {
          totalSessions: sessions.length,
          uniqueErrorTypes: Object.keys(errorTypeCounts).length,
          uniqueLanguages: Object.keys(langCounts).length,
          avgConfidence,
          currentStreak,
          maxStreak,
          activeDays: Object.keys(dailyCounts).length,
        },
        errorDistribution,
        languageDistribution,
        confidenceTimeline,
        conceptGaps,
        dailyActivity,
        recurringMistakes,
        conceptWeaknesses,
      },
    });
  } catch (error) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
