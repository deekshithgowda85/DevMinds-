// ─── DevMind Local Bedrock Client ────────────────────────────
// Direct Bedrock call from Next.js (fallback when Lambda gateway fails)
// Uses same DeepSeek R1 + Nova Lite models as the Lambda

import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PRIMARY_MODEL = 'us.deepseek.r1-v1:0';
const FALLBACK_MODEL = 'us.amazon.nova-lite-v1:0';

let client: BedrockRuntimeClient | null = null;

function getClient(): BedrockRuntimeClient {
  if (!client) {
    client = new BedrockRuntimeClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.access_key || process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.secret_key || process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  return client;
}

export function isBedrockConfigured(): boolean {
  return !!((process.env.access_key || process.env.AWS_ACCESS_KEY_ID) &&
            (process.env.secret_key || process.env.AWS_SECRET_ACCESS_KEY));
}

function extractJSON(text: string): Record<string, unknown> | null {
  // Strip DeepSeek R1 <think>...</think> reasoning blocks
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  try { return JSON.parse(cleaned); } catch {}

  const stripped = cleaned.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch {}

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

async function callModel(modelId: string, systemPrompt: string, userMessage: string) {
  const response = await getClient().send(new ConverseCommand({
    modelId,
    system: [{ text: systemPrompt }],
    messages: [{ role: 'user', content: [{ text: userMessage }] }],
    inferenceConfig: { maxTokens: 4096, temperature: 0.3 },
  }));

  return response.output?.message?.content?.[0]?.text || '';
}

/**
 * Call Bedrock directly for JSON response (DeepSeek R1 → Nova Lite fallback)
 */
export async function callBedrockForJSON<T = Record<string, unknown>>(
  systemPrompt: string,
  userMessage: string,
): Promise<T> {
  // Try DeepSeek R1
  try {
    console.log('[Bedrock-Local] Calling DeepSeek R1...');
    const text = await callModel(PRIMARY_MODEL, systemPrompt, userMessage);
    const result = extractJSON(text);
    if (result) return result as T;
    console.warn('[Bedrock-Local] DeepSeek R1 JSON parse failed, trying Nova Lite');
  } catch (err) {
    console.warn('[Bedrock-Local] DeepSeek R1 failed:', (err as Error).message);
  }

  // Fallback to Nova Lite
  console.log('[Bedrock-Local] Calling Nova Lite fallback...');
  const text = await callModel(FALLBACK_MODEL, systemPrompt, userMessage);
  const result = extractJSON(text);
  if (result) return result as T;

  throw new Error('Both DeepSeek R1 and Nova Lite failed to produce valid JSON');
}
