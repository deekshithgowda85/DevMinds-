// ─── DevMind Pinecone Vector DB Client ──────────────────────
// Manages connection to Pinecone for vector similarity search.

import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

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
