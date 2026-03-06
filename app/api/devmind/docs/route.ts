// ─── DevMind SmartDocs API ────────────────────────────────────
// POST /api/devmind/docs
// Generates a learning report from the user's debug history.

import { NextRequest, NextResponse } from 'next/server';
import { generateSmartDocs } from '@/lib/devmind/llm/chain';
import { callGateway } from '@/lib/devmind/aws/gateway';
import { getUserSessions } from '@/lib/devmind/aws/sessions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as Record<string, unknown>;

    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required field: userId (must be a non-empty string)' },
        { status: 400 }
      );
    }

    console.log(`[API/docs] Generating SmartDocs (userId length: ${userId.length})`);

    // Fetch user's debug history from DynamoDB to provide context
    let historyContext = '';
    try {
      const sessions = await getUserSessions(userId);
      if (sessions.length > 0) {
        const recent = sessions.slice(-10);
        historyContext = recent.map((s) =>
          `[${s.createdAt}] ${s.language} - ${s.errorType}: ${s.conceptGap}`
        ).join('\n');
      }
    } catch { /* no history available */ }

    // ── Try AWS Gateway first ──
    // Include history + timestamp in code field to prevent stale caching
    const gwResponse = await callGateway({
      userId,
      language: 'javascript',
      code: historyContext || `Generate fresh report at ${new Date().toISOString()}`,
      actionType: 'docs',
    });

    if (gwResponse?.success && gwResponse.data) {
      const d = gwResponse.data;
      console.log(`[API/docs] AWS Gateway hit (cached: ${gwResponse.meta?.cached})`);

      // Map Lambda response → component's expected shape
      const recurringMistakes = Array.isArray(d.recurringMistakes) ? d.recurringMistakes : [];
      const conceptWeaknesses = Array.isArray(d.conceptWeaknesses) ? d.conceptWeaknesses : [];
      const learningRoadmap = Array.isArray(d.learningRoadmap) ? d.learningRoadmap : [];

      return NextResponse.json({
        success: true,
        report: {
          generatedAt: new Date().toISOString(),
          totalSessionsAnalyzed: recurringMistakes.reduce((sum: number, m: { count?: number }) => sum + (m.count || 0), 0),
          sections: {
            recurringMistakes: {
              title: 'Recurring Mistakes',
              items: recurringMistakes.map((m: { pattern?: string; count?: number; trend?: string }) => ({
                errorType: m.pattern || 'Unknown',
                count: m.count || 0,
                trend: m.trend === 'improving' ? 'decreasing' : m.trend === 'worsening' ? 'increasing' : 'stable',
              })),
            },
            conceptWeaknesses: {
              title: 'Concept Weaknesses',
              items: conceptWeaknesses.map((w: { concept?: string; severity?: string; suggestion?: string }) => ({
                concept: w.concept || 'Unknown',
                severity: w.severity || 'medium',
                sessionsAffected: 0,
              })),
            },
            learningRoadmap: {
              title: 'Learning Roadmap',
              steps: learningRoadmap.map((s: { priority?: number; topic?: string; reason?: string }) => ({
                priority: s.priority || 0,
                topic: s.topic || '',
                reason: s.reason || '',
              })),
            },
            debugSpeedMetrics: {
              title: 'Debug Speed Metrics',
              avgConfidenceOverTime: [],
              recurringErrorReduction: 'Keep debugging to build confidence metrics.',
            },
          },
          markdownReport: (d.markdownReport as string) || (d.analysis as string) || '',
        },
        meta: gwResponse.meta,
      });
    }

    // ── Fallback: local Groq pipeline ──
    console.log('[API/docs] Falling back to local Groq pipeline');
    const report = await generateSmartDocs(userId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (_error: unknown) {
    console.error('[API/docs] Internal error occurred');

    return NextResponse.json(
      { success: false, error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
