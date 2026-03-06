// ─── DevMind Lambda: Main Handler ────────────────────────────────────────────
// Entry point for all AI orchestration
// POST /analyze → { userId, language, code, error, actionType }

import { buildSystemPrompt, buildUserMessage } from './prompts.mjs';
import { callAI } from './bedrock.mjs';
import { generateHash, getCachedResponse, storeCachedResponse } from './cache.mjs';
import { storeLearningEntry, getUserHistory, buildHistorySummary } from './memory.mjs';
import { logRequestMetrics } from './metrics.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Content-Type': 'application/json'
};

// ── Rate Limiting Config ─────────────────────────────────────────────────────
const RATE_LIMIT = {
  maxRequests: 20,   // max requests per window
  windowMs: 60_000,  // 1 minute window
};
const rateLimitStore = new Map(); // in-memory (resets on cold start, good enough)

function isRateLimited(userId) {
  const now = Date.now();
  const key = userId || 'anonymous';
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT.windowMs) {
    rateLimitStore.set(key, { windowStart: now, count: 1 });
    return { limited: false, remaining: RATE_LIMIT.maxRequests - 1 };
  }

  entry.count++;
  if (entry.count > RATE_LIMIT.maxRequests) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT.windowMs - now) / 1000);
    return { limited: true, remaining: 0, retryAfter };
  }

  return { limited: false, remaining: RATE_LIMIT.maxRequests - entry.count };
}

function response(statusCode, body, extraHeaders = {}) {
  return { statusCode, headers: { ...CORS_HEADERS, ...extraHeaders }, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  const requestStart = Date.now();

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' };
  }

  // ── Parse request ──────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { success: false, error: 'Invalid JSON body' });
  }

  const { userId, language, code, error, actionType } = body;

  // Validate required fields
  if (!userId || !actionType) {
    return response(400, { success: false, error: 'Missing required fields: userId, actionType' });
  }

  if (!['fix', 'explain', 'quiz', 'docs'].includes(actionType)) {
    return response(400, { success: false, error: 'actionType must be: fix | explain | quiz | docs' });
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const rateCheck = isRateLimited(userId);
  if (rateCheck.limited) {
    console.log(`[Handler] Rate limited: userId=${userId}, retryAfter=${rateCheck.retryAfter}s`);
    return response(429, {
      success: false,
      error: `Rate limit exceeded. Try again in ${rateCheck.retryAfter} seconds.`,
      retryAfter: rateCheck.retryAfter,
    }, { 'Retry-After': String(rateCheck.retryAfter) });
  }

  console.log(`[Handler] Request: userId=${userId}, action=${actionType}, lang=${language}, remaining=${rateCheck.remaining}`);

  let cacheHit = false;
  let bedrockCalled = false;
  let modelUpgraded = false;

  try {
    // ── Step 1: Check cache ────────────────────────────────────────────────────
    const requestHash = generateHash(code || '', error || '', actionType, language || '');
    const cached = await getCachedResponse(requestHash);

    if (cached) {
      cacheHit = true;
      console.log(`[Handler] Cache HIT — returning instantly`);

      await logRequestMetrics({ cacheHit, bedrockCalled, modelUpgraded, latencyMs: Date.now() - requestStart, actionType });

      return response(200, {
        success: true,
        data: JSON.parse(cached.response),
        meta: { cached: true, modelUsed: cached.modelUsed, tokenCount: cached.tokenCount }
      });
    }

    // ── Step 2: Fetch user history for personalization ─────────────────────────
    const userHistory = await getUserHistory(userId);
    const historySummary = buildHistorySummary(userHistory);

    // ── Step 3: Build prompts ──────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(actionType);
    const userMessage = buildUserMessage(actionType, {
      language: language || 'javascript',
      code: code || '',
      error: error || '',
      errorHistory: historySummary
    });

    // ── Step 4: Call AI (Bedrock → Groq fallback) ──────────────────────────────
    bedrockCalled = true;
    const { result, modelUsed, tokenCount, latency, upgraded } = await callAI(systemPrompt, userMessage);
    modelUpgraded = upgraded;

    console.log(`[Handler] AI response: model=${modelUsed}, tokens=${tokenCount}, upgraded=${upgraded}`);

    // ── Step 5: Store in cache ────────────────────────────────────────────────
    await storeCachedResponse({ requestHash, response: result, modelUsed, tokenCount, actionType });

    // ── Step 6: Store learning profile (only for fix/explain actions with errors) ─
    if ((actionType === 'fix' || actionType === 'explain') && userId) {
      await storeLearningEntry({
        userId,
        language: language || 'javascript',
        errorType: result.errorType || 'unknown',
        conceptGap: result.conceptGap || '',
        confidenceScore: result.confidenceScore || 0.5,
        code: code || '',
        resolved: actionType === 'fix'
      });
    }

    // ── Step 7: Log CloudWatch metrics ────────────────────────────────────────
    await logRequestMetrics({
      cacheHit: false,
      bedrockCalled,
      modelUpgraded,
      latencyMs: Date.now() - requestStart,
      actionType
    });

    return response(200, {
      success: true,
      data: result,
      meta: { cached: false, modelUsed, tokenCount, latencyMs: latency }
    });

  } catch (err) {
    console.error('[Handler] Error:', err.message);

    await logRequestMetrics({
      cacheHit, bedrockCalled, modelUpgraded,
      latencyMs: Date.now() - requestStart, actionType
    }).catch(() => {});

    return response(500, {
      success: false,
      error: 'Internal server error',
      detail: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};
