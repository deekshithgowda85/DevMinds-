// ─── DevMind Lambda: DynamoDB Cache ─────────────────────────────────────────
// SHA256 hashing + cache get/put for CodeAnalysisCache table

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { createHash } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = 'DevMind-CodeAnalysisCache';
const TTL_SECONDS = 60 * 60 * 24; // 24 hours

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

/**
 * Generate deterministic SHA256 hash of code + error + actionType
 * Same input = same hash = cache hit (cost saving)
 */
export function generateHash(code, error, actionType) {
  const input = `${actionType}::${error || ''}::${code}`;
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Check DynamoDB cache for existing response
 * Returns null if not found or expired
 */
export async function getCachedResponse(requestHash) {
  try {
    const result = await dynamo.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { requestHash }
    }));

    if (!result.Item) return null;

    console.log(`[Cache] HIT for hash: ${requestHash.slice(0, 16)}...`);
    return result.Item;
  } catch (err) {
    console.warn('[Cache] Get error:', err.message);
    return null;
  }
}

/**
 * Store response in DynamoDB with TTL
 */
export async function storeCachedResponse({ requestHash, response, modelUsed, tokenCount, actionType }) {
  try {
    const ttl = Math.floor(Date.now() / 1000) + TTL_SECONDS;
    await dynamo.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        requestHash,
        response: JSON.stringify(response),
        modelUsed,
        tokenCount: tokenCount || 0,
        actionType,
        timestamp: new Date().toISOString(),
        ttl  // DynamoDB will auto-delete after 24h
      }
    }));
    console.log(`[Cache] STORED hash: ${requestHash.slice(0, 16)}... (TTL: 24h)`);
  } catch (err) {
    console.warn('[Cache] Store error:', err.message);
    // Don't fail the request if caching fails
  }
}
