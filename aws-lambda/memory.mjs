// ─── DevMind Lambda: User Learning Memory ────────────────────────────────────
// Read/write UserLearningProfile in DynamoDB

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = 'DevMind-UserLearningProfile';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

/**
 * Store a learning profile entry when user hits an error
 */
export async function storeLearningEntry({ userId, language, errorType, conceptGap, confidenceScore, code, resolved = false }) {
  try {
    const timestamp = new Date().toISOString();
    const errorKey = `${errorType || 'unknown'}_${timestamp}`;

    await dynamo.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        userId,
        errorKey,
        language: language || 'unknown',
        errorType: errorType || 'unknown',
        conceptGap: conceptGap || '',
        attemptCount: 1,
        resolved,
        confidenceScore: confidenceScore || 0.5,
        code: (code || '').slice(0, 500), // Store first 500 chars only
        timestamp
      }
    }));
    console.log(`[Memory] Stored entry for userId: ${userId}, error: ${errorType}`);
  } catch (err) {
    console.warn('[Memory] Store error:', err.message);
  }
}

/**
 * Get recent learning history for a user (last 20 entries)
 * Used to personalize prompts with user's weak areas
 */
export async function getUserHistory(userId, limit = 20) {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false, // Latest first
      Limit: limit
    }));

    return result.Items || [];
  } catch (err) {
    console.warn('[Memory] Query error:', err.message);
    return [];
  }
}

/**
 * Build error history summary string from past entries (for prompt context)
 */
export function buildHistorySummary(entries) {
  if (!entries || entries.length === 0) return '';

  const errorCounts = {};
  const conceptGaps = [];

  for (const entry of entries) {
    const type = entry.errorType || 'unknown';
    errorCounts[type] = (errorCounts[type] || 0) + 1;
    if (entry.conceptGap && !conceptGaps.includes(entry.conceptGap)) {
      conceptGaps.push(entry.conceptGap);
    }
  }

  const topErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => `${type} (${count}x)`)
    .join(', ');

  return [
    topErrors ? `Frequent errors: ${topErrors}` : '',
    conceptGaps.length ? `Concept gaps: ${conceptGaps.slice(0, 5).join(', ')}` : ''
  ].filter(Boolean).join('\n');
}
