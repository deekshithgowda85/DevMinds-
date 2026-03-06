// ─── DevMind Analytics API ───────────────────────────────────
// GET /api/devmind/analytics — Aggregate learning analytics from DynamoDB

import { NextRequest, NextResponse } from 'next/server';
import { getUserSessions } from '@/lib/devmind/aws/sessions';

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

    // Fetch sessions from DynamoDB
    let sessions: Awaited<ReturnType<typeof getUserSessions>> = [];
    try {
      sessions = await getUserSessions(userId);
    } catch (e) {
      console.warn('[Analytics] DynamoDB fetch failed:', e instanceof Error ? e.message : e);
    }

    if (sessions.length === 0) {
      return NextResponse.json({
        success: true,
        analytics: {
          totalSessions: 0,
          totalConcepts: 0,
          avgConfidence: 0,
          strongLanguages: [],
          recentSessions: [],
          conceptsByLanguage: {},
          confidenceOverTime: [],
        },
      });
    }

    // ─── Language Distribution ─────────────────────────
    const langCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      langCounts[s.language] = (langCounts[s.language] || 0) + 1;
    });

    // ─── Concept Gap Frequency ─────────────────────────
    const conceptCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.conceptGap) {
        conceptCounts[s.conceptGap] = (conceptCounts[s.conceptGap] || 0) + 1;
      }
    });

    // ─── Summary Stats ─────────────────────────────────
    const avgConfidence =
      sessions.reduce((sum, s) => sum + s.confidenceLevel, 0) / sessions.length;

    // ─── Build conceptsByLanguage from concept gaps ────
    const conceptsByLanguage: Record<string, number> = {};
    sessions.forEach((s) => {
      conceptsByLanguage[s.language] = (conceptsByLanguage[s.language] || 0) + (s.conceptGap ? 1 : 0);
    });

    // ─── Build recentSessions ──────────────────────────
    const recentSessions = sessions.slice(-10).reverse().map((s) => ({
      date: s.createdAt.split('T')[0],
      conceptsLearned: s.conceptGap ? 1 : 0,
      avgConfidence: s.confidenceLevel,
      language: s.language,
      topics: s.conceptGap ? [s.conceptGap] : [],
    }));

    // ─── Strong languages (>= 3 sessions) ──────────────
    const strongLanguages = Object.entries(langCounts)
      .filter(([, count]) => count >= 3)
      .map(([lang]) => lang);

    // ─── Confidence over time ──────────────────────────
    const confidenceOverTime = sessions.map((s) => ({
      date: s.createdAt.split('T')[0],
      confidence: s.confidenceLevel,
    }));

    // ─── Total concepts learned ────────────────────────
    const totalConcepts = Object.keys(conceptCounts).length;

    return NextResponse.json({
      success: true,
      analytics: {
        totalSessions: sessions.length,
        totalConcepts,
        avgConfidence,
        strongLanguages,
        recentSessions,
        conceptsByLanguage,
        confidenceOverTime,
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
