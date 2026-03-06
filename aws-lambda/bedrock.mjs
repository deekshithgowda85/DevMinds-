// ─── DevMind Lambda: Amazon Bedrock Integration ──────────────────────────────
// Calls DeepSeek R1 via Bedrock Converse API (unified interface for all models)
// Fallback: Groq (llama-3.3-70b) if Bedrock fails

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PRIMARY_MODEL = 'us.deepseek.r1-v1:0';       // DeepSeek R1 on Bedrock
const FALLBACK_MODEL = 'us.amazon.nova-lite-v1:0';  // Nova Lite (fast fallback)

const bedrockClient = new BedrockRuntimeClient({ region: REGION });

/**
 * Call Bedrock using Converse API (works with all models uniformly)
 */
async function callBedrock(modelId, systemPrompt, userMessage) {
  const start = Date.now();
  const response = await bedrockClient.send(new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: userMessage }] }],
    inferenceConfig: {
      maxTokens: 4096,
      temperature: 0.3,  // Low temp for consistent JSON output
    }
  }));

  const text = response.output?.message?.content?.[0]?.text || '';
  const latency = Date.now() - start;
  const tokenCount = (response.usage?.inputTokens || 0) + (response.usage?.outputTokens || 0);

  return { text, latency, tokenCount, modelId };
}

/**
 * Extract JSON from LLM response (handles markdown code blocks + DeepSeek <think> tags)
 */
export function extractJSON(text) {
  // Strip DeepSeek R1 <think>...</think> reasoning blocks
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}

  // Strip markdown code blocks
  const stripped = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // Find JSON object in text
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  return null;
}

/**
 * Main AI call with model routing:
 * 1. Try DeepSeek R1 (primary)
 * 2. If JSON parse fails or confidence < 0.6 → retry with Nova Lite
 */
export async function callAI(systemPrompt, userMessage) {
  let result = null;
  let usedModel = PRIMARY_MODEL;
  let totalTokens = 0;
  let latency = 0;
  let upgraded = false;

  // Step 1: Try primary model (DeepSeek R1)
  try {
    console.log(`[Bedrock] Calling primary model: ${PRIMARY_MODEL}`);
    const response = await callBedrock(PRIMARY_MODEL, systemPrompt, userMessage);
    result = extractJSON(response.text);
    totalTokens = response.tokenCount;
    latency = response.latency;
    usedModel = response.modelId;

    // Step 2: Model routing — if parse failed or low confidence, try Nova Lite
    if (!result || (typeof result.confidenceScore === 'number' && result.confidenceScore < 0.6)) {
      const reason = !result ? 'JSON parse failed' : `low confidence (${result.confidenceScore})`;
      console.log(`[Bedrock] ${reason}, falling back to ${FALLBACK_MODEL}`);
      try {
        const fallback_response = await callBedrock(FALLBACK_MODEL, systemPrompt, userMessage);
        const fallback_result = extractJSON(fallback_response.text);
        if (fallback_result) {
          result = fallback_result;
          totalTokens += fallback_response.tokenCount;
          latency += fallback_response.latency;
          usedModel = fallback_response.modelId;
          upgraded = true;
        }
      } catch (fallbackErr) {
        console.warn('[Bedrock] Fallback model failed:', fallbackErr.message);
      }
    }
  } catch (bedrockErr) {
    // Step 3: Primary failed entirely — fall back to Nova Lite
    console.warn('[Bedrock] Primary failed, falling back to Nova Lite:', bedrockErr.message);
    try {
      const fallbackResponse = await callBedrock(FALLBACK_MODEL, systemPrompt, userMessage);
      result = extractJSON(fallbackResponse.text);
      totalTokens = fallbackResponse.tokenCount;
      latency = fallbackResponse.latency;
      usedModel = fallbackResponse.modelId;
    } catch (fallbackErr) {
      throw new Error(`Both DeepSeek R1 and Nova Lite failed: ${bedrockErr.message} | ${fallbackErr.message}`);
    }
  }

  if (!result) {
    throw new Error('Failed to parse JSON response from AI model');
  }

  return { result, modelUsed: usedModel, tokenCount: totalTokens, latency, upgraded };
}
