// ─── DevMind Chain — Full Debug + SmartDocs Pipeline ─────────
// Orchestrates: Memory → Prompt → LLM → Store → Response

import { callLLMForJSON } from './groq';
import { isGroqAvailable } from './groq';
import {
  buildDebugSystemPrompt,
  buildDebugUserMessage,
  buildDocsSystemPrompt,
  buildDocsUserMessage,
  buildExplainSystemPrompt,
  buildExplainUserMessage,
} from './prompts';
import { retrieveMemoryContext } from '../memory/retrieval';
import { storeDebugMemory } from '../memory/storage';
import { prisma, isDatabaseConfigured } from '../database/postgres';
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
  let insight: LearningInsight;
  try {
    if (!isGroqAvailable()) throw new Error('Groq not available');
    const llmResult = await callLLMForJSON<LearningInsight>(
      systemPrompt,
      userMessage
    );
    if (!llmResult) throw new Error('LLM returned null');
    insight = llmResult;
  } catch (llmError) {
    console.warn('[Chain] LLM unavailable, using pattern-based fallback:', (llmError as Error).message);
    insight = buildFallbackInsight(language, errorMessage);
  }

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
  let totalSessions = 1;
  let uniqueErrorTypesCount = 1;
  if (isDatabaseConfigured()) {
    try {
      totalSessions = await prisma.debugSession.count({ where: { userId } });
      const uniqueErrorTypes = await prisma.debugSession.findMany({
        where: { userId },
        distinct: ['errorType'],
        select: { errorType: true },
      });
      uniqueErrorTypesCount = uniqueErrorTypes.length;
    } catch {
      console.warn('[Chain] DB query for stats failed, using defaults');
    }
  }

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
      uniqueErrorTypes: uniqueErrorTypesCount,
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
  let sessions: Array<{ language: string; errorType: string; conceptGap: string | null; confidenceLevel: number; createdAt: Date }> = [];
  let metrics: Awaited<ReturnType<typeof prisma.learningMetric.findUnique>> = null;

  if (isDatabaseConfigured()) {
    try {
      [sessions, metrics] = await Promise.all([
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
    } catch (dbErr) {
      console.warn('[Chain] DB fetch for SmartDocs failed:', (dbErr as Error).message);
    }
  }

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
  let llmReport: {
    recurringMistakes: Array<{ errorType: string; count: number; trend: string; insight: string }>;
    conceptWeaknesses: Array<{ concept: string; severity: string; sessionsAffected: number; recommendation: string }>;
    learningRoadmap: Array<{ priority: number; topic: string; reason: string; resources?: string }>;
    overallProgress: string;
    debugSpeedMetrics: { avgConfidence: number; trend: string; recurringErrorReduction: string };
  };
  try {
    if (!isGroqAvailable()) throw new Error('Groq not available');
    const result = await callLLMForJSON<typeof llmReport>(systemPrompt, userMessage);
    if (!result) throw new Error('LLM returned null');
    llmReport = result;
  } catch (llmErr) {
    console.warn('[Chain] LLM unavailable for SmartDocs, using data-only report:', (llmErr as Error).message);
    llmReport = {
      recurringMistakes: [],
      conceptWeaknesses: [],
      learningRoadmap: [{ priority: 1, topic: 'Configure API keys', reason: 'LLM service unavailable — add a valid GROQ_API_KEY to .env.local' }],
      overallProgress: 'Unable to generate AI analysis — LLM service is not reachable.',
      debugSpeedMetrics: { avgConfidence: 0, trend: 'stable', recurringErrorReduction: 'Not enough data' },
    };
  }

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

// ─── Code Explain Pipeline ──────────────────────────────────

/**
 * Explain code section-by-section with personalization.
 *
 * 1. Retrieve user's known weak concepts from memory
 * 2. Build explain prompt
 * 3. Call LLM for section-by-section breakdown
 * 4. Return structured explanation
 */
export async function explainCode(request: {
  userId: string;
  language: string;
  code: string;
}): Promise<{
  success: boolean;
  explanation: {
    title: string;
    overview: string;
    sections: Array<{
      lineRange: string;
      code: string;
      explanation: string;
      concept: string;
      difficulty: 'easy' | 'medium' | 'hard';
      relatedWeakness: string | null;
    }>;
    complexity: 'beginner' | 'intermediate' | 'advanced';
    keyConcepts: string[];
    personalNotes: string[];
  };
  personalizedTips: string[];
}> {
  const { userId, language, code } = request;

  // Step 1: Get known weak concepts from learning metrics
  let weakConcepts: string[] = [];
  if (isDatabaseConfigured()) {
    try {
      const metrics = await prisma.learningMetric.findUnique({
        where: { userId },
      });
      if (metrics?.conceptWeaknesses) {
        const cw = metrics.conceptWeaknesses as Array<{ concept: string; count: number }> | string[];
        weakConcepts = cw.map((w) => (typeof w === 'string' ? w : w.concept));
      }
    } catch {
      // No metrics yet, that's fine
    }
  }

  // Step 2: Build prompt
  const systemPrompt = buildExplainSystemPrompt(weakConcepts);
  const userMessage = buildExplainUserMessage(language, code);

  // Step 3: Call LLM
  console.log('[Chain] Calling Groq LLM for code explanation...');
  let result: {
    title: string;
    overview: string;
    sections: Array<{ lineRange: string; code: string; explanation: string; concept: string; difficulty: string; relatedWeakness: string | null }>;
    complexity: string;
    keyConcepts: string[];
    personalNotes: string[];
  };
  try {
    if (!isGroqAvailable()) throw new Error('Groq not available');
    const llmResult = await callLLMForJSON<typeof result>(systemPrompt, userMessage);
    if (!llmResult) throw new Error('LLM returned null');
    result = llmResult;
  } catch (llmErr) {
    console.warn('[Chain] LLM unavailable for explain, using fallback:', (llmErr as Error).message);
    result = {
      title: 'Code Explanation (Offline)',
      overview: 'The AI analysis service is currently unreachable. Please check your GROQ_API_KEY and network connection.',
      sections: [{ lineRange: '1-*', code: code.slice(0, 200), explanation: 'LLM service unavailable — cannot generate detailed explanation.', concept: 'N/A', difficulty: 'medium', relatedWeakness: null }],
      complexity: 'intermediate',
      keyConcepts: [],
      personalNotes: ['Configure a valid GROQ_API_KEY in .env.local to enable AI-powered explanations.'],
    };
  }

  // Normalize difficulty and complexity values
  const normDiff = (d: string): 'easy' | 'medium' | 'hard' => {
    const v = d?.toLowerCase();
    if (v === 'easy') return 'easy';
    if (v === 'hard') return 'hard';
    return 'medium';
  };
  const normComp = (c: string): 'beginner' | 'intermediate' | 'advanced' => {
    const v = c?.toLowerCase();
    if (v === 'beginner') return 'beginner';
    if (v === 'advanced') return 'advanced';
    return 'intermediate';
  };

  return {
    success: true,
    explanation: {
      title: result.title || 'Code Explanation',
      overview: result.overview || '',
      sections: (result.sections || []).map((s) => ({
        lineRange: s.lineRange,
        code: s.code,
        explanation: s.explanation,
        concept: s.concept,
        difficulty: normDiff(s.difficulty),
        relatedWeakness: s.relatedWeakness || null,
      })),
      complexity: normComp(result.complexity),
      keyConcepts: result.keyConcepts || [],
      personalNotes: result.personalNotes || [],
    },
    personalizedTips: result.personalNotes || [],
  };
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
      const arrow = m.trend === 'decreasing' ? '\u2193' : m.trend === 'increasing' ? '\u2191' : '\u2192';
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
      const badge = w.severity === 'high' ? '\uD83D\uDD34' : w.severity === 'medium' ? '\uD83D\uDFE1' : '\uD83D\uDFE2';
      lines.push(`- ${badge} **${w.concept}** \u2014 ${w.recommendation}`);
    }
  } else {
    lines.push('No concept weaknesses identified.');
  }
  lines.push('');

  // Learning Roadmap
  lines.push('## Learning Roadmap');
  if (llmReport.learningRoadmap?.length) {
    for (const s of llmReport.learningRoadmap.sort((a, b) => a.priority - b.priority)) {
      lines.push(`${s.priority}. **${s.topic}** \u2014 ${s.reason}`);
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

/**
 * Build a pattern-based fallback insight when the LLM is unavailable.
 */
function buildFallbackInsight(language: string, errorMessage: string): LearningInsight {
  const msg = errorMessage.toLowerCase();
  let errorType = 'Unknown';
  let conceptGap = 'General debugging';
  let explanation = 'The AI analysis service is currently unreachable. Here is a basic pattern-based analysis.';
  let fix = 'Please check your code for common issues related to the error message.';
  let tip = 'Configure a valid GROQ_API_KEY in .env.local for AI-powered analysis.';

  if (msg.includes('typeerror') || msg.includes('type error')) {
    errorType = 'TypeError';
    conceptGap = 'Type handling and null checks';
    explanation = 'A TypeError typically occurs when an operation is performed on a value of the wrong type, or when accessing properties on null/undefined.';
    fix = 'Add null/undefined checks before accessing properties. Use optional chaining (?.) or type guards.';
    tip = 'Always validate variable types before operations. Use TypeScript for static type checking.';
  } else if (msg.includes('referenceerror') || msg.includes('not defined')) {
    errorType = 'ReferenceError';
    conceptGap = 'Variable scope and declarations';
    explanation = 'A ReferenceError occurs when referencing a variable that has not been declared or is out of scope.';
    fix = 'Ensure the variable is declared before use and is in the correct scope.';
    tip = 'Use const/let instead of var. Check for typos in variable names.';
  } else if (msg.includes('syntaxerror') || msg.includes('unexpected token')) {
    errorType = 'SyntaxError';
    conceptGap = 'Language syntax rules';
    explanation = 'A SyntaxError occurs when the code violates the grammar rules of the programming language.';
    fix = 'Check for missing brackets, semicolons, or mismatched quotes near the error location.';
    tip = 'Use a linter/formatter to catch syntax issues early.';
  } else if (msg.includes('indexerror') || msg.includes('out of range') || msg.includes('out of bounds')) {
    errorType = 'IndexError';
    conceptGap = 'Array/list bounds checking';
    explanation = 'An IndexError occurs when trying to access an array/list element at an index that does not exist.';
    fix = 'Check array length before accessing elements. Use bounds checking.';
    tip = 'Always validate index values against collection sizes.';
  } else if (msg.includes('keyerror') || msg.includes('key error')) {
    errorType = 'KeyError';
    conceptGap = 'Dictionary/Map key handling';
    explanation = 'A KeyError occurs when trying to access a dictionary key that does not exist.';
    fix = 'Use .get() with a default value, or check key existence before access.';
    tip = 'Prefer defensive access patterns when working with dictionaries.';
  } else if (msg.includes('import') || msg.includes('module')) {
    errorType = 'ImportError';
    conceptGap = 'Module system and dependencies';
    explanation = 'An import/module error occurs when a required module cannot be found or loaded.';
    fix = 'Verify the module is installed and the import path is correct.';
    tip = 'Check package.json/requirements.txt for missing dependencies.';
  }

  return {
    errorType,
    detectedConceptGap: conceptGap,
    explanationSummary: `[${language}] ${explanation}`,
    fix,
    confidenceLevel: 0.4,
    isRecurring: false,
    learningTip: tip,
  };
}
