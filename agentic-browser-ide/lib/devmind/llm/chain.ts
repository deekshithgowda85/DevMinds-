// ─── DevMind Chain — Full Debug + SmartDocs Pipeline ─────────
// Orchestrates: Memory → Prompt → LLM → Store → Response

import { callLLMForJSON } from './groq';
import {
  buildDebugSystemPrompt,
  buildDebugUserMessage,
  buildDocsSystemPrompt,
  buildDocsUserMessage,
} from './prompts';
import { retrieveMemoryContext } from '../memory/retrieval';
import { storeDebugMemory } from '../memory/storage';
import { prisma } from '../database/postgres';
import type {
  DebugRequest,
  DebugResponse,
  LearningInsight,
  SmartDocsReport,
} from '../types';

// ─── CodeTrace Debugger Pipeline ────────────────────────────

/**
 * Full debug pipeline with memory awareness.
 *
 * 1. Retrieve memory context (past errors, learning metrics)
 * 2. Build memory-aware prompt
 * 3. Call LLM for analysis
 * 4. Store results in PostgreSQL + Pinecone
 * 5. Return structured response
 */
export async function debugWithMemory(
  request: DebugRequest
): Promise<DebugResponse> {
  const { userId, language, code, errorMessage } = request;

  // Step 1: Retrieve memory context
  console.log('[Chain] Retrieving memory context for', userId);
  const memoryContext = await retrieveMemoryContext(
    userId,
    language,
    code,
    errorMessage
  );

  // Step 2: Build memory-aware prompt
  const systemPrompt = buildDebugSystemPrompt(memoryContext);
  const userMessage = buildDebugUserMessage(language, code, errorMessage);

  // Step 3: Call LLM
  console.log('[Chain] Calling Groq LLM for debug analysis...');
  const insight = await callLLMForJSON<LearningInsight>(
    systemPrompt,
    userMessage
  );

  // Step 4: Store in memory (PostgreSQL + Pinecone)
  console.log('[Chain] Storing debug session in memory...');
  const sessionId = await storeDebugMemory({
    userId,
    language,
    codeSnippet: code,
    errorMessage,
    errorType: insight.errorType || 'Unknown',
    conceptGap: insight.detectedConceptGap || null,
    explanation: insight.explanationSummary || null,
    fix: insight.fix || null,
    confidenceLevel: insight.confidenceLevel ?? 0.5,
  });

  // Step 5: Build response
  // Get updated session count
  const totalSessions = await prisma.debugSession.count({
    where: { userId },
  });
  const uniqueErrorTypes = await prisma.debugSession.findMany({
    where: { userId },
    distinct: ['errorType'],
    select: { errorType: true },
  });

  return {
    success: true,
    sessionId,
    result: {
      errorType: insight.errorType,
      detectedConceptGap: insight.detectedConceptGap,
      explanationSummary: insight.explanationSummary,
      fix: insight.fix,
      confidenceLevel: insight.confidenceLevel,
      isRecurring: insight.isRecurring ?? memoryContext.similarPastErrors.length > 0,
      learningTip: insight.learningTip,
      similarPastErrors: memoryContext.similarPastErrors.length,
    },
    memoryStats: {
      totalSessions,
      uniqueErrorTypes: uniqueErrorTypes.length,
    },
  };
}

// ─── SmartDocs Generator Pipeline ───────────────────────────

/**
 * Generate a SmartDocs learning report for a user.
 *
 * 1. Fetch all sessions + metrics from PostgreSQL
 * 2. Build docs prompt
 * 3. Call LLM for report generation
 * 4. Format and return SmartDocsReport
 */
export async function generateSmartDocs(
  userId: string
): Promise<SmartDocsReport> {
  console.log('[Chain] Generating SmartDocs for', userId);

  // Step 1: Fetch data from PostgreSQL
  const [sessions, metrics] = await Promise.all([
    prisma.debugSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        language: true,
        errorType: true,
        conceptGap: true,
        confidenceLevel: true,
        createdAt: true,
      },
    }),
    prisma.learningMetric.findUnique({
      where: { userId },
    }),
  ]);

  if (sessions.length === 0) {
    return buildEmptyReport();
  }

  // Step 2: Build prompt
  const systemPrompt = buildDocsSystemPrompt();

  const metricsSummary = metrics
    ? {
        totalSessions: metrics.totalSessions,
        recurringMistakes: (metrics.recurringMistakes as Array<{ errorType: string; count: number }>) || [],
        conceptWeaknesses: (metrics.conceptWeaknesses as Array<{ concept: string; count: number }>) || [],
        improvementMetrics: (metrics.improvementMetrics as {
          avgConfidence: number;
          confidenceHistory: number[];
        }) || { avgConfidence: 0, confidenceHistory: [] },
      }
    : null;

  const userMessage = buildDocsUserMessage(sessions, metricsSummary);

  // Step 3: Call LLM
  console.log('[Chain] Calling Groq LLM for SmartDocs report...');
  const llmReport = await callLLMForJSON<{
    recurringMistakes: Array<{
      errorType: string;
      count: number;
      trend: string;
      insight: string;
    }>;
    conceptWeaknesses: Array<{
      concept: string;
      severity: string;
      sessionsAffected: number;
      recommendation: string;
    }>;
    learningRoadmap: Array<{
      priority: number;
      topic: string;
      reason: string;
      resources?: string;
    }>;
    overallProgress: string;
    debugSpeedMetrics: {
      avgConfidence: number;
      trend: string;
      recurringErrorReduction: string;
    };
  }>(systemPrompt, userMessage);

  // Step 4: Format into SmartDocsReport
  const report: SmartDocsReport = {
    generatedAt: new Date().toISOString(),
    totalSessionsAnalyzed: sessions.length,
    sections: {
      recurringMistakes: {
        title: 'Recurring Mistakes',
        items: (llmReport.recurringMistakes || []).map((m) => ({
          errorType: m.errorType,
          count: m.count,
          trend: normalizeTrend(m.trend),
        })),
      },
      conceptWeaknesses: {
        title: 'Concept Weaknesses',
        items: (llmReport.conceptWeaknesses || []).map((w) => ({
          concept: w.concept,
          severity: normalizeSeverity(w.severity),
          sessionsAffected: w.sessionsAffected,
        })),
      },
      learningRoadmap: {
        title: 'Learning Roadmap',
        steps: (llmReport.learningRoadmap || []).map((s) => ({
          priority: s.priority,
          topic: s.topic,
          reason: s.reason,
        })),
      },
      debugSpeedMetrics: {
        title: 'Debug Speed Metrics',
        avgConfidenceOverTime: metricsSummary?.improvementMetrics?.confidenceHistory || [],
        recurringErrorReduction:
          llmReport.debugSpeedMetrics?.recurringErrorReduction || 'Not enough data',
      },
    },
    markdownReport: buildMarkdownReport(llmReport, sessions.length),
  };

  return report;
}

// ─── Helpers ────────────────────────────────────────────────

function normalizeTrend(trend: string): 'increasing' | 'decreasing' | 'stable' {
  const t = trend?.toLowerCase();
  if (t === 'increasing') return 'increasing';
  if (t === 'decreasing') return 'decreasing';
  return 'stable';
}

function normalizeSeverity(severity: string): 'high' | 'medium' | 'low' {
  const s = severity?.toLowerCase();
  if (s === 'high') return 'high';
  if (s === 'low') return 'low';
  return 'medium';
}

function buildEmptyReport(): SmartDocsReport {
  return {
    generatedAt: new Date().toISOString(),
    totalSessionsAnalyzed: 0,
    sections: {
      recurringMistakes: { title: 'Recurring Mistakes', items: [] },
      conceptWeaknesses: { title: 'Concept Weaknesses', items: [] },
      learningRoadmap: { title: 'Learning Roadmap', steps: [] },
      debugSpeedMetrics: {
        title: 'Debug Speed Metrics',
        avgConfidenceOverTime: [],
        recurringErrorReduction: 'No data yet',
      },
    },
    markdownReport: '# SmartDocs Report\n\nNo debugging sessions found. Start debugging to build your learning profile!',
  };
}

function buildMarkdownReport(
  llmReport: {
    recurringMistakes?: Array<{ errorType: string; count: number; trend: string; insight: string }>;
    conceptWeaknesses?: Array<{ concept: string; severity: string; recommendation: string }>;
    learningRoadmap?: Array<{ priority: number; topic: string; reason: string }>;
    overallProgress?: string;
    debugSpeedMetrics?: { avgConfidence: number; recurringErrorReduction: string };
  },
  totalSessions: number
): string {
  const lines: string[] = [];
  lines.push('# DevMind SmartDocs Report');
  lines.push(`\n*Generated on ${new Date().toLocaleDateString()} | ${totalSessions} sessions analyzed*\n`);

  // Overall Progress
  if (llmReport.overallProgress) {
    lines.push('## Overall Progress');
    lines.push(llmReport.overallProgress);
    lines.push('');
  }

  // Recurring Mistakes
  lines.push('## Recurring Mistakes');
  if (llmReport.recurringMistakes?.length) {
    for (const m of llmReport.recurringMistakes) {
      const arrow = m.trend === 'decreasing' ? '↓' : m.trend === 'increasing' ? '↑' : '→';
      lines.push(`- **${m.errorType}** (${m.count}x) ${arrow} ${m.insight}`);
    }
  } else {
    lines.push('No recurring mistakes found yet.');
  }
  lines.push('');

  // Concept Weaknesses
  lines.push('## Concept Weaknesses');
  if (llmReport.conceptWeaknesses?.length) {
    for (const w of llmReport.conceptWeaknesses) {
      const badge = w.severity === 'high' ? '🔴' : w.severity === 'medium' ? '🟡' : '🟢';
      lines.push(`- ${badge} **${w.concept}** — ${w.recommendation}`);
    }
  } else {
    lines.push('No concept weaknesses identified.');
  }
  lines.push('');

  // Learning Roadmap
  lines.push('## Learning Roadmap');
  if (llmReport.learningRoadmap?.length) {
    for (const s of llmReport.learningRoadmap.sort((a, b) => a.priority - b.priority)) {
      lines.push(`${s.priority}. **${s.topic}** — ${s.reason}`);
    }
  } else {
    lines.push('Keep debugging to build your personalized roadmap!');
  }
  lines.push('');

  // Metrics
  if (llmReport.debugSpeedMetrics) {
    lines.push('## Debug Metrics');
    lines.push(`- Average Confidence: ${(llmReport.debugSpeedMetrics.avgConfidence * 100).toFixed(0)}%`);
    lines.push(`- ${llmReport.debugSpeedMetrics.recurringErrorReduction}`);
  }

  return lines.join('\n');
}
