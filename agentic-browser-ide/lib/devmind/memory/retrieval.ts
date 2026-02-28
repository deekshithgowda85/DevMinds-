// ─── DevMind Memory Retrieval ────────────────────────────────
// Retrieves similar past errors from Pinecone + user context from PostgreSQL.

import { prisma } from '../database/postgres';
import { getMemoryIndex } from '../database/pinecone';
import { generateErrorEmbedding } from './embeddings';
import type { MemoryContext, SimilarError } from '../types';

/**
 * Retrieve full memory context for a user based on current error.
 * Combines vector similarity (Pinecone) + structured data (PostgreSQL).
 */
export async function retrieveMemoryContext(
  userId: string,
  language: string,
  code: string,
  errorMessage: string
): Promise<MemoryContext> {
  // Run similarity search and DB queries in parallel
  const [similarErrors, metrics, recentSessions] = await Promise.all([
    findSimilarErrors(userId, language, code, errorMessage),
    getLearningMetrics(userId),
    getRecentSessions(userId, 10),
  ]);

  // Extract recurring mistakes from metrics
  const recurringMistakes = Array.isArray(metrics?.recurringMistakes)
    ? (metrics.recurringMistakes as Array<{ errorType: string; count: number }>).map(
        (m) => `${m.errorType} (${m.count}x)`
      )
    : [];

  // Extract concept weaknesses
  const knownWeakConcepts = Array.isArray(metrics?.conceptWeaknesses)
    ? (metrics.conceptWeaknesses as Array<{ concept: string; count: number }>).map(
        (w) => w.concept
      )
    : [];

  // Get recent error types
  const recentErrorTypes = [...new Set(recentSessions.map((s) => s.errorType))];

  return {
    similarPastErrors: similarErrors,
    recurringMistakes,
    knownWeakConcepts,
    totalSessionCount: metrics?.totalSessions ?? 0,
    recentErrorTypes,
  };
}

/**
 * Find similar past errors using Pinecone vector similarity search.
 */
async function findSimilarErrors(
  userId: string,
  language: string,
  code: string,
  errorMessage: string,
  topK: number = 5
): Promise<SimilarError[]> {
  try {
    // Generate embedding for current error
    const embedding = await generateErrorEmbedding(language, code, errorMessage);

    // Query Pinecone with userId filter
    const index = getMemoryIndex();
    const results = await index.query({
      vector: embedding,
      topK,
      filter: { userId: { $eq: userId } },
      includeMetadata: true,
    });

    if (!results.matches) return [];

    return results.matches
      .filter((match) => (match.score ?? 0) > 0.3) // Minimum similarity threshold
      .map((match) => ({
        sessionId: (match.metadata?.sessionId as string) || '',
        errorType: (match.metadata?.errorType as string) || 'unknown',
        conceptGap: (match.metadata?.conceptGap as string) || 'unknown',
        language: (match.metadata?.language as string) || 'unknown',
        similarity: match.score ?? 0,
        timestamp: (match.metadata?.timestamp as string) || '',
      }));
  } catch (error) {
    console.error('[Retrieval] Pinecone query failed:', error);
    return [];
  }
}

/**
 * Get learning metrics from PostgreSQL.
 */
async function getLearningMetrics(userId: string) {
  try {
    return await prisma.learningMetric.findUnique({
      where: { userId },
    });
  } catch {
    return null;
  }
}

/**
 * Get recent debug sessions from PostgreSQL.
 */
async function getRecentSessions(userId: string, limit: number) {
  try {
    return await prisma.debugSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}
