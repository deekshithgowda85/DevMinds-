// ─── DevMind DynamoDB Auth ──────────────────────────────────
// Simple username/password auth backed by DynamoDB
// Table: DevMind-Users (partition key: username)

import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const TABLE_NAME = 'DevMind-Users';

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

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(salt + password).digest('hex');
}

export interface DevMindUser {
  username: string;
  displayName: string;
  createdAt: string;
}

/**
 * Register a new user. Returns the user object or throws on failure.
 */
export async function registerUser(
  username: string,
  password: string,
  displayName: string,
): Promise<DevMindUser> {
  const db = getClient();

  // Check if user already exists
  const existing = await db.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { username: { S: username.toLowerCase() } },
  }));

  if (existing.Item) {
    throw new Error('Username already taken');
  }

  const salt = randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const now = new Date().toISOString();

  await db.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      username: { S: username.toLowerCase() },
      displayName: { S: displayName },
      passwordHash: { S: passwordHash },
      salt: { S: salt },
      createdAt: { S: now },
    },
    ConditionExpression: 'attribute_not_exists(username)',
  }));

  return { username: username.toLowerCase(), displayName, createdAt: now };
}

/**
 * Login: verify username + password. Returns user object or null.
 */
export async function loginUser(
  username: string,
  password: string,
): Promise<DevMindUser | null> {
  const db = getClient();

  const result = await db.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { username: { S: username.toLowerCase() } },
  }));

  if (!result.Item) return null;

  const storedHash = result.Item.passwordHash?.S || '';
  const salt = result.Item.salt?.S || '';
  const computedHash = hashPassword(password, salt);

  // Timing-safe comparison to prevent timing attacks
  const storedBuf = Buffer.from(storedHash, 'hex');
  const computedBuf = Buffer.from(computedHash, 'hex');
  if (storedBuf.length !== computedBuf.length || !timingSafeEqual(storedBuf, computedBuf)) {
    return null;
  }

  return {
    username: result.Item.username?.S || '',
    displayName: result.Item.displayName?.S || '',
    createdAt: result.Item.createdAt?.S || '',
  };
}

/**
 * Get user by username (public info only)
 */
export async function getUser(username: string): Promise<DevMindUser | null> {
  const db = getClient();

  const result = await db.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { username: { S: username.toLowerCase() } },
  }));

  if (!result.Item) return null;

  return {
    username: result.Item.username?.S || '',
    displayName: result.Item.displayName?.S || '',
    createdAt: result.Item.createdAt?.S || '',
  };
}

/**
 * Generate a simple session token (SHA256 of username + secret + timestamp)
 */
export function generateSessionToken(username: string): string {
  const secret = process.env.SESSION_SECRET || 'devmind-default-secret-change-in-production';
  const timestamp = Date.now().toString();
  const token = createHash('sha256').update(`${username}:${secret}:${timestamp}`).digest('hex');
  return `${username}:${timestamp}:${token}`;
}

/**
 * Verify a session token. Returns username if valid, null otherwise.
 */
export function verifySessionToken(token: string): string | null {
  const parts = token.split(':');
  if (parts.length !== 3) return null;

  const [username, timestamp, hash] = parts;
  const secret = process.env.SESSION_SECRET || 'devmind-default-secret-change-in-production';
  const expected = createHash('sha256').update(`${username}:${secret}:${timestamp}`).digest('hex');

  // Token expires after 7 days
  const age = Date.now() - parseInt(timestamp, 10);
  if (isNaN(age) || age > 7 * 24 * 60 * 60 * 1000) return null;

  const expectedBuf = Buffer.from(expected, 'hex');
  const hashBuf = Buffer.from(hash, 'hex');
  if (expectedBuf.length !== hashBuf.length || !timingSafeEqual(expectedBuf, hashBuf)) {
    return null;
  }

  return username;
}
