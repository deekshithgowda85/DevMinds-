// ─── DevMind Embedding Generator ─────────────────────────────
// Generates vector embeddings for error context.
// Uses deterministic hash-based embedding for MVP reliability.
// Can be upgraded to neural embeddings (OpenAI, Cohere) later.

import { buildErrorContext, truncateText } from '../utils';

const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector from error context text.
 * Uses a deterministic hash-based approach that produces
 * consistent vectors — similar text → similar vectors.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = truncateText(text, 2000);
  return generateHashEmbedding(truncated);
}

/**
 * Deterministic hash-based embedding fallback.
 * Not as good as neural embeddings, but works offline and is fast.
 * Produces consistent vectors for similar text inputs.
 */
function generateHashEmbedding(text: string): number[] {
  const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().trim();

  // Use multiple hash seeds for better distribution
  for (let i = 0; i < normalized.length; i++) {
    const charCode = normalized.charCodeAt(i);
    for (let seed = 0; seed < 3; seed++) {
      const idx = ((charCode * 31 + i * 17 + seed * 7) & 0x7fffffff) % EMBEDDING_DIMENSIONS;
      embedding[idx] += (charCode - 96) / (normalized.length * (seed + 1));
    }
  }

  // Add word-level features
  const words = normalized.split(/\s+/);
  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    let wordHash = 0;
    for (let c = 0; c < word.length; c++) {
      wordHash = ((wordHash << 5) - wordHash + word.charCodeAt(c)) & 0x7fffffff;
    }
    const idx = wordHash % EMBEDDING_DIMENSIONS;
    embedding[idx] += 1.0 / words.length;
  }

  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
  if (magnitude > 0) {
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] /= magnitude;
    }
  }

  return embedding;
}

/**
 * Build error context string and generate its embedding.
 */
export async function generateErrorEmbedding(
  language: string,
  code: string,
  errorMessage: string
): Promise<number[]> {
  const context = buildErrorContext(language, code, errorMessage);
  return generateEmbedding(context);
}

/**
 * Pad or truncate a vector to the target length.
 */
function padToLength(vec: number[], targetLength: number): number[] {
  if (vec.length === targetLength) return vec;
  if (vec.length > targetLength) return vec.slice(0, targetLength);
  return [...vec, ...new Array(targetLength - vec.length).fill(0)];
}
