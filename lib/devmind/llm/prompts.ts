// ─── DevMind Prompt Templates ────────────────────────────────
// Memory-aware prompts for debug analysis and SmartDocs generation.

import type { MemoryContext } from '../types';

// ─── CodeTrace Debugger Prompt ──────────────────────────────

/**
 * Build a system prompt for memory-aware debugging.
 * Injects user's past error patterns, concept gaps, and similar errors.
 */
export function buildDebugSystemPrompt(memoryContext: MemoryContext | null): string {
  let memorySection = '';

  if (memoryContext && memoryContext.totalSessionCount > 0) {
    memorySection = `
## USER'S LEARNING HISTORY
This user has ${memoryContext.totalSessionCount} past debugging sessions with you.

### Recurring Mistakes
${memoryContext.recurringMistakes.length > 0
  ? memoryContext.recurringMistakes.map((m) => `- ${m}`).join('\n')
  : '- No recurring mistakes detected yet'}

### Known Concept Weaknesses
${memoryContext.knownWeakConcepts.length > 0
  ? memoryContext.knownWeakConcepts.map((c) => `- ${c}`).join('\n')
  : '- No concept weaknesses detected yet'}

### Similar Past Errors
${memoryContext.similarPastErrors.length > 0
  ? memoryContext.similarPastErrors
      .slice(0, 3)
      .map(
        (e) =>
          `- [${e.errorType}] concept gap: "${e.conceptGap}" (${(e.similarity * 100).toFixed(0)}% similar, ${e.language})`
      )
      .join('\n')
  : '- No similar errors found in history'}

### Recent Error Types
${memoryContext.recentErrorTypes.length > 0
  ? memoryContext.recentErrorTypes.map((t) => `- ${t}`).join('\n')
  : '- No recent errors'}

IMPORTANT: Use this history to personalize your response. If this is a recurring mistake, explicitly call it out and provide a deeper explanation of the underlying concept.
`;
  }

  return `You are DevMind, a memory-aware AI debugger that learns from a developer's past mistakes.

Your job is to:
1. Analyze the code and error
2. Identify the root cause
3. Detect the underlying concept gap (what the developer doesn't understand)
4. Provide a clear fix
5. Give a personalized learning tip based on their history
${memorySection}
## RESPONSE FORMAT
You MUST respond with ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "errorType": "The category of error (e.g., TypeError, SyntaxError, LogicError, RuntimeError)",
  "detectedConceptGap": "The underlying concept the developer needs to learn (e.g., 'async/await understanding', 'null safety', 'array indexing')",
  "explanationSummary": "A clear 2-4 sentence explanation of what went wrong and WHY",
  "fix": "The corrected code snippet",
  "confidenceLevel": 0.85,
  "isRecurring": false,
  "learningTip": "A personalized tip that helps the developer avoid this in the future"
}

Rules:
- confidenceLevel: 0.0 to 1.0 (how confident you are in your diagnosis)
- isRecurring: true if this error pattern appears in the user's history
- Keep explanationSummary concise but educational
- The fix should be actual working code
- learningTip should reference their history if available`;
}

/**
 * Build the user message for debug analysis.
 */
export function buildDebugUserMessage(
  language: string,
  code: string,
  errorMessage: string
): string {
  return `## Debug This Code

**Language:** ${language}

**Code:**
\`\`\`${language}
${code}
\`\`\`

**Error Message:**
\`\`\`
${errorMessage}
\`\`\`

Analyze this error, identify the concept gap, and provide a fix.`;
}

// ─── Code Explain Prompt ────────────────────────────────────

/**
 * Build a system prompt for code explanation.
 */
export function buildExplainSystemPrompt(weakConcepts: string[]): string {
  const weaknessNote = weakConcepts.length > 0
    ? `\n\nThis developer has known weaknesses in: ${weakConcepts.join(', ')}. Pay EXTRA attention to these concepts and flag them with "relatedWeakness".`
    : '';

  return `You are DevMind's Code Explainer. You break down code into logical sections and explain each one clearly.
${weaknessNote}
## RESPONSE FORMAT
You MUST respond with ONLY a valid JSON object:
{
  "title": "A short descriptive title for this code",
  "overview": "1-2 sentence summary of what the code does overall",
  "sections": [
    {
      "lineRange": "1-5",
      "code": "the actual code for this section",
      "explanation": "Clear explanation of what this section does and why",
      "concept": "The programming concept (e.g., 'closures', 'async/await', 'recursion')",
      "difficulty": "easy|medium|hard",
      "relatedWeakness": null or "concept name if it matches a known weakness"
    }
  ],
  "complexity": "beginner|intermediate|advanced",
  "keyConcepts": ["concept1", "concept2"],
  "personalNotes": ["Personalized tips based on this code and the developer's weaknesses"]
}

Rules:
- Break the code into 3-8 logical sections
- Each section should cover a coherent chunk of logic
- difficulty: easy (basic syntax), medium (requires understanding), hard (advanced pattern)
- complexity: overall code difficulty level
- keyConcepts: list all programming concepts used
- personalNotes: if the developer has known weaknesses that appear in this code, add specific learning notes`;
}

/**
 * Build the user message for code explanation.
 */
export function buildExplainUserMessage(language: string, code: string): string {
  return `## Explain This Code\n\n**Language:** ${language}\n\n**Code:**\n\`\`\`${language}\n${code}\n\`\`\`\n\nBreak this code into logical sections and explain each one.`;
}

// ─── SmartDocs Generator Prompt ─────────────────────────────

interface SessionSummary {
  language: string;
  errorType: string;
  conceptGap: string | null;
  confidenceLevel: number;
  createdAt: Date;
}

interface MetricsSummary {
  totalSessions: number;
  recurringMistakes: Array<{ errorType: string; count: number }>;
  conceptWeaknesses: Array<{ concept: string; count: number }>;
  improvementMetrics: {
    avgConfidence: number;
    confidenceHistory: number[];
  };
}

/**
 * Build a system prompt for SmartDocs report generation.
 */
export function buildDocsSystemPrompt(): string {
  return `You are DevMind's SmartDocs Generator. You analyze a developer's debugging history and produce a comprehensive learning report.

## RESPONSE FORMAT
You MUST respond with ONLY a valid JSON object:
{
  "recurringMistakes": [
    { "errorType": "TypeError", "count": 5, "trend": "decreasing", "insight": "..." }
  ],
  "conceptWeaknesses": [
    { "concept": "null safety", "severity": "high", "sessionsAffected": 4, "recommendation": "..." }
  ],
  "learningRoadmap": [
    { "priority": 1, "topic": "Null/undefined handling", "reason": "Most frequent error source", "resources": "..." }
  ],
  "overallProgress": "A 2-3 sentence summary of the developer's progress and areas to focus on",
  "debugSpeedMetrics": {
    "avgConfidence": 0.82,
    "trend": "improving",
    "recurringErrorReduction": "Reduced TypeError frequency by 30% over last 5 sessions"
  }
}

Rules:
- trend must be: "increasing", "decreasing", or "stable"
- severity must be: "high", "medium", or "low"
- Priority 1 = most urgent topic to study
- Be specific and actionable in recommendations
- Reference actual error types and concepts from the data`;
}

/**
 * Build the user message for SmartDocs generation.
 */
export function buildDocsUserMessage(
  sessions: SessionSummary[],
  metrics: MetricsSummary | null
): string {
  const sessionLines = sessions.slice(0, 30).map(
    (s, i) =>
      `${i + 1}. [${s.language}] ${s.errorType} — gap: "${s.conceptGap || 'unknown'}" (confidence: ${s.confidenceLevel.toFixed(2)}, date: ${s.createdAt.toISOString().split('T')[0]})`
  );

  let metricsSection = 'No aggregated metrics available yet.';
  if (metrics) {
    metricsSection = `
**Total Sessions:** ${metrics.totalSessions}
**Avg Confidence:** ${metrics.improvementMetrics?.avgConfidence?.toFixed(2) ?? 'N/A'}
**Recurring Mistakes:** ${metrics.recurringMistakes.map((m) => `${m.errorType} (${m.count}x)`).join(', ') || 'None'}
**Concept Weaknesses:** ${metrics.conceptWeaknesses.map((w) => `${w.concept} (${w.count}x)`).join(', ') || 'None'}
**Confidence History (recent):** [${metrics.improvementMetrics?.confidenceHistory?.slice(-10).map((c) => c.toFixed(2)).join(', ') ?? 'N/A'}]`;
  }

  return `## Generate SmartDocs Report

### Debug Session History
${sessionLines.join('\n')}

### Aggregated Metrics
${metricsSection}

Analyze this developer's debugging history and generate a comprehensive learning report.`;
}
