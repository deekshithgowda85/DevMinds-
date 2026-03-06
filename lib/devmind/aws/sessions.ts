// ─── DevMind DynamoDB Debug Sessions ─────────────────────────
// Stores and retrieves debug sessions for analytics
// Table: DevMind-DebugSessions (PK: userId, SK: createdAt)

import { DynamoDBClient, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = 'DevMind-DebugSessions';

let client: DynamoDBClient | null = null;

function getClient(): DynamoDBClient {
  if (!client) {
    client = new DynamoDBClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.access_key || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.secret_key || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return client;
}

export interface DebugSessionRecord {
  userId: string;
  createdAt: string;
  language: string;
  errorType: string;
  conceptGap: string;
  confidenceLevel: number;
  explanation: string;
  fix: string;
}

/** Store a debug session to DynamoDB */
export async function storeDebugSession(session: Omit<DebugSessionRecord, 'createdAt'>): Promise<void> {
  const now = new Date().toISOString();
  await getClient().send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      userId: { S: session.userId },
      createdAt: { S: now },
      language: { S: session.language },
      errorType: { S: session.errorType },
      conceptGap: { S: session.conceptGap || '' },
      confidenceLevel: { N: String(session.confidenceLevel) },
      explanation: { S: (session.explanation || '').slice(0, 4000) },
      fix: { S: (session.fix || '').slice(0, 4000) },
    },
  }));
}

/** Get all debug sessions for a user (sorted by createdAt ascending) */
export async function getUserSessions(userId: string): Promise<DebugSessionRecord[]> {
  const result = await getClient().send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': { S: userId } },
    ScanIndexForward: true, // ascending
  }));

  return (result.Items || []).map((item) => ({
    userId: item.userId?.S || '',
    createdAt: item.createdAt?.S || '',
    language: item.language?.S || '',
    errorType: item.errorType?.S || '',
    conceptGap: item.conceptGap?.S || '',
    confidenceLevel: parseFloat(item.confidenceLevel?.N || '0'),
    explanation: item.explanation?.S || '',
    fix: item.fix?.S || '',
  }));
}
