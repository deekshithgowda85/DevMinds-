// ─── DevMind Lambda: Amazon Bedrock Integration ──────────────────────────────
// Calls DeepSeek R1 via Bedrock Converse API (unified interface for all models)
// Fallback: Groq (llama-3.3-70b) if Bedrock fails

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PRIMARY_MODEL = 'us.deepseek.r1-v1:0';       // DeepSeek R1 on Bedrock
const FALLBACK_MODEL = 'us.amazon.nova-lite-v1:0';  // Nova Lite (free, fast fallback)
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

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
 * Call Groq as fallback (uses existing GROQ_API_KEY env var)
 */
async function callGroq(systemPrompt, userMessage) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY not set');

  const start = Date.now();
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.3,
    })
  });

  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  const latency = Date.now() - start;
  const tokenCount = data.usage?.total_tokens || 0;

  return { text, latency, tokenCount, modelId: `groq/${GROQ_MODEL}` };
}

/**
 * Extract JSON from LLM response (handles markdown code blocks)
 */
export function extractJSON(text) {
  // Try direct parse first
  try { return JSON.parse(text.trim()); } catch {}

  // Strip markdown code blocks
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch {}

  // Find JSON object in text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }

  return null;
}

/**
 * Main AI call with model routing:
 * 1. Try DeepSeek R1 (primary)
 * 2. If confidence < 0.6 in response → retry with Nova Lite
 * 3. If Bedrock fails → fallback to Groq
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

    // Step 2: Model routing — if low confidence, retry with fallback model
    if (result && typeof result.confidenceScore === 'number' && result.confidenceScore < 0.6) {
      console.log(`[Bedrock] Low confidence (${result.confidenceScore}), upgrading to ${FALLBACK_MODEL}`);
      try {
        const upgraded_response = await callBedrock(FALLBACK_MODEL, systemPrompt, userMessage);
        const upgraded_result = extractJSON(upgraded_response.text);
        if (upgraded_result) {
          result = upgraded_result;
          totalTokens += upgraded_response.tokenCount;
          latency += upgraded_response.latency;
          usedModel = upgraded_response.modelId;
          upgraded = true;
        }
      } catch (upgradeErr) {
        console.warn('[Bedrock] Upgrade model failed, keeping primary result:', upgradeErr.message);
      }
    }
  } catch (bedrockErr) {
    // Step 3: Bedrock failed entirely — fall back to Groq
    console.warn('[Bedrock] Failed, falling back to Groq:', bedrockErr.message);
    try {
      const groqResponse = await callGroq(systemPrompt, userMessage);
      result = extractJSON(groqResponse.text);
      totalTokens = groqResponse.tokenCount;
      latency = groqResponse.latency;
      usedModel = groqResponse.modelId;
    } catch (groqErr) {
      throw new Error(`Both Bedrock and Groq failed: ${bedrockErr.message} | ${groqErr.message}`);
    }
  }

  if (!result) {
    throw new Error('Failed to parse JSON response from AI model');
  }

  return { result, modelUsed: usedModel, tokenCount: totalTokens, latency, upgraded };
}
