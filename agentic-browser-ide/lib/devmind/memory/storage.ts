// ─── DevMind Memory Storage ──────────────────────────────────
// Stores debug sessions in PostgreSQL + vectors in Pinecone.

import { prisma } from '../database/postgres';
import { getMemoryIndex } from '../database/pinecone';
import { generateErrorEmbedding } from './embeddings';
import type { VectorMetadata } from '../types';

interface StoreDebugMemoryInput {
  userId: string;
  language: string;
  codeSnippet: string;
  errorMessage: string;
  errorType: string;
  conceptGap: string | null;
  explanation: string | null;
  fix: string | null;
  confidenceLevel: number;
}

/**
 * Store a debug session in both PostgreSQL and Pinecone.
 * Returns the created session ID.
 */
export async function storeDebugMemory(input: StoreDebugMemoryInput): Promise<string> {
  // 1. Ensure user exists (upsert)
  await prisma.user.upsert({
    where: { email: `${input.userId}@devmind.local` },
    update: {},
    create: {
      id: input.userId,
      email: `${input.userId}@devmind.local`,
      name: input.userId,
    },
  });

  // 2. Generate embedding
  const embedding = await generateErrorEmbedding(
    input.language,
    input.codeSnippet,
    input.errorMessage
  );

  // 3. Store in PostgreSQL
  const session = await prisma.debugSession.create({
    data: {
      userId: input.userId,
      language: input.language,
      codeSnippet: input.codeSnippet,
      errorMessage: input.errorMessage,
      errorType: input.errorType,
      conceptGap: input.conceptGap,
      explanation: input.explanation,
      fix: input.fix,
      confidenceLevel: input.confidenceLevel,
      vectorId: null, // Will be updated after Pinecone upsert
    },
  });

  // 4. Store vector in Pinecone
  const vectorId = `debug-${session.id}`;
  const metadata: VectorMetadata = {
    userId: input.userId,
    errorType: input.errorType,
    language: input.language,
    conceptGap: input.conceptGap || 'unknown',
    sessionId: session.id,
    timestamp: new Date().toISOString(),
  };

  try {
    const index = getMemoryIndex();
    await index.upsert({
      records: [
        {
          id: vectorId,
          values: embedding,
          metadata: metadata as unknown as Record<string, string>,
        },
      ],
    });

    // Update session with vectorId
    await prisma.debugSession.update({
      where: { id: session.id },
      data: { vectorId },
    });
  } catch (error) {
    console.error('[Storage] Pinecone upsert failed (session still saved in DB):', error);
  }

  // 5. Update learning metrics
  await updateLearningMetrics(input.userId);

  return session.id;
}

/**
 * Update aggregated learning metrics for a user.
 */
async function updateLearningMetrics(userId: string): Promise<void> {
  try {
    // Get all sessions for this user
    const sessions = await prisma.debugSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate recurring mistakes
    const errorCounts: Record<string, number> = {};
    const conceptGaps: Record<string, number> = {};
    const confidences: number[] = [];

    for (const s of sessions) {
      errorCounts[s.errorType] = (errorCounts[s.errorType] || 0) + 1;
      if (s.conceptGap) {
        conceptGaps[s.conceptGap] = (conceptGaps[s.conceptGap] || 0) + 1;
      }
      confidences.push(s.confidenceLevel);
    }

    const recurringMistakes = Object.entries(errorCounts)
      .filter(([, count]) => count >= 2)
      .map(([errorType, count]) => ({ errorType, count }));

    const conceptWeaknesses = Object.entries(conceptGaps)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([concept, count]) => ({ concept, count }));

    const avgConfidence = confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

    // Upsert learning metrics
    await prisma.learningMetric.upsert({
      where: { userId },
      update: {
        totalSessions: sessions.length,
        recurringMistakes: JSON.parse(JSON.stringify(recurringMistakes)),
        conceptWeaknesses: JSON.parse(JSON.stringify(conceptWeaknesses)),
        improvementMetrics: JSON.parse(JSON.stringify({
          avgConfidence,
          totalErrors: sessions.length,
          uniqueErrorTypes: Object.keys(errorCounts).length,
          confidenceHistory: confidences.slice(0, 20),
        })),
        lastCalculated: new Date(),
      },
      create: {
        userId,
        totalSessions: sessions.length,
        recurringMistakes: JSON.parse(JSON.stringify(recurringMistakes)),
        conceptWeaknesses: JSON.parse(JSON.stringify(conceptWeaknesses)),
        improvementMetrics: JSON.parse(JSON.stringify({
          avgConfidence,
          totalErrors: sessions.length,
          uniqueErrorTypes: Object.keys(errorCounts).length,
          confidenceHistory: confidences.slice(0, 20),
        })),
      },
    });
  } catch (error) {
    console.error('[Storage] Failed to update learning metrics:', error);
  }
}
