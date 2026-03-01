// ─── DevMind Core Types ──────────────────────────────────────
// All types used across the DevMind feature set.
// Does NOT touch any existing types in lib/types.ts

// ─── Debug Request / Response ────────────────────────────────

export interface DebugRequest {
  userId: string;
  language: string;
  code: string;
  errorMessage: string;
}

export interface DebugResponse {
  success: boolean;
  sessionId: string;
  result: {
    errorType: string;
    detectedConceptGap: string;
    explanationSummary: string;
    fix: string;
    confidenceLevel: number;
    isRecurring: boolean;
    learningTip: string;
    similarPastErrors: number;
  };
  memoryStats: {
    totalSessions: number;
    uniqueErrorTypes: number;
  };
}

// ─── Memory Context ──────────────────────────────────────────

export interface MemoryContext {
  similarPastErrors: SimilarError[];
  recurringMistakes: string[];
  knownWeakConcepts: string[];
  totalSessionCount: number;
  recentErrorTypes: string[];
}

export interface SimilarError {
  sessionId: string;
  errorType: string;
  conceptGap: string;
  language: string;
  similarity: number;
  timestamp: string;
}

// ─── Learning Insight (LLM Output) ──────────────────────────

export interface LearningInsight {
  errorType: string;
  detectedConceptGap: string;
  explanationSummary: string;
  fix: string;
  confidenceLevel: number;
  isRecurring: boolean;
  learningTip: string;
}

// ─── SmartDocs Report ────────────────────────────────────────

export interface SmartDocsReport {
  generatedAt: string;
  totalSessionsAnalyzed: number;
  sections: {
    recurringMistakes: {
      title: string;
      items: RecurringMistakeItem[];
    };
    conceptWeaknesses: {
      title: string;
      items: ConceptWeaknessItem[];
    };
    learningRoadmap: {
      title: string;
      steps: RoadmapStep[];
    };
    debugSpeedMetrics: {
      title: string;
      avgConfidenceOverTime: number[];
      recurringErrorReduction: string;
    };
  };
  markdownReport: string;
}

export interface RecurringMistakeItem {
  errorType: string;
  count: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface ConceptWeaknessItem {
  concept: string;
  severity: 'high' | 'medium' | 'low';
  sessionsAffected: number;
}

export interface RoadmapStep {
  priority: number;
  topic: string;
  reason: string;
}

// ─── Pinecone Vector Metadata ────────────────────────────────

export interface VectorMetadata {
  userId: string;
  errorType: string;
  language: string;
  conceptGap: string;
  sessionId: string;
  timestamp: string;
}
