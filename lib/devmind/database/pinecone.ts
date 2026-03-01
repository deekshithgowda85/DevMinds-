// ─── DevMind Pinecone Vector DB Client ──────────────────────
// Manages connection to Pinecone for vector similarity search.

import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

// ─── Circuit Breaker ────────────────────────────────────────
// After a connection failure, skip Pinecone for COOLDOWN_MS to avoid
// blocking every request with a 10s timeout.
let _circuitOpen = false;
let _circuitOpenedAt = 0;
const COOLDOWN_MS = 60_000; // 1 minute

export function isPineconeAvailable(): boolean {
  if (!isPineconeConfigured()) return false;
  if (_circuitOpen) {
    // Check if cooldown has elapsed
    if (Date.now() - _circuitOpenedAt > COOLDOWN_MS) {
      _circuitOpen = false; // Try again
      console.log('[Pinecone] Circuit breaker reset — will retry connection');
      return true;
    }
    return false;
  }
  return true;
}

export function tripPineconeCircuit(): void {
  _circuitOpen = true;
  _circuitOpenedAt = Date.now();
  console.warn('[Pinecone] Circuit breaker tripped — skipping Pinecone for 60s');
}

/**
 * Check if Pinecone is configured with a real API key.
 */
export function isPineconeConfigured(): boolean {
  const key = process.env.PINECONE_API_KEY;
  return !!key && key !== 'your-pinecone-api-key' && !key.includes('your-');
}

/**
 * Get or create a Pinecone client singleton.
 */
export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
      throw new Error('PINECONE_API_KEY is not set in environment variables');
    }
    pineconeClient = new Pinecone({ apiKey });
  }
  return pineconeClient;
}

/**
 * Get the DevMind memory index.
 */
export function getMemoryIndex() {
  const client = getPineconeClient();
  const indexName = process.env.PINECONE_INDEX || 'devmind-memory';
  return client.index(indexName);
}

/**
 * Check if Pinecone is properly configured and accessible.
 */
export async function checkPineconeHealth(): Promise<{
  connected: boolean;
  indexName: string;
  error?: string;
}> {
  const indexName = process.env.PINECONE_INDEX || 'devmind-memory';
  try {
    const client = getPineconeClient();
    const indexList = await client.listIndexes();
    const indexExists = indexList.indexes?.some((idx) => idx.name === indexName);
    
    return {
      connected: true,
      indexName,
      error: indexExists ? undefined : `Index "${indexName}" not found. Please create it in the Pinecone dashboard.`,
    };
  } catch (error) {
    return {
      connected: false,
      indexName,
      error: error instanceof Error ? error.message : 'Unknown Pinecone error',
    };
  }
}
