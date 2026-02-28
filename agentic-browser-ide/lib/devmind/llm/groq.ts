// ─── DevMind Groq LLM Client ─────────────────────────────────
// Wrapper around Groq SDK for LLM inference.

import Groq from 'groq-sdk';

// ─── Singleton ───────────────────────────────────────────────

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('[Groq] GROQ_API_KEY not set in environment');
    }
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

// ─── Configuration ──────────────────────────────────────────

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const FALLBACK_MODEL = 'mixtral-8x7b-32768';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

// ─── Core LLM Call ──────────────────────────────────────────

/**
 * Call Groq LLM with system prompt and user message.
 * Includes retry logic and fallback model support.
 */
export async function callLLM(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const client = getGroqClient();
  const model = options?.model ?? DEFAULT_MODEL;
  const temperature = options?.temperature ?? 0.3;
  const maxTokens = options?.maxTokens ?? 2048;

  let lastError: Error | null = null;

  // Try primary model, then fallback
  const modelsToTry = [model, FALLBACK_MODEL];

  for (const currentModel of modelsToTry) {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.chat.completions.create({
          model: currentModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature,
          max_tokens: maxTokens,
          ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from Groq');
        }

        return content;
      } catch (error: unknown) {
        lastError = error instanceof Error ? error : new Error(String(error));
        const errorMsg = lastError.message.toLowerCase();

        // Rate limit — wait and retry
        if (errorMsg.includes('rate_limit') || errorMsg.includes('429')) {
          console.warn(`[Groq] Rate limited on ${currentModel}, attempt ${attempt + 1}/${MAX_RETRIES + 1}`);
          await sleep(RETRY_DELAY_MS * (attempt + 1));
          continue;
        }

        // Model not available — try fallback
        if (errorMsg.includes('model') || errorMsg.includes('not found')) {
          console.warn(`[Groq] Model ${currentModel} unavailable, trying next`);
          break; // Break retry loop, try next model
        }

        // Other errors — retry
        if (attempt < MAX_RETRIES) {
          console.warn(`[Groq] Error on attempt ${attempt + 1}: ${lastError.message}`);
          await sleep(RETRY_DELAY_MS);
          continue;
        }
      }
    }
  }

  throw new Error(`[Groq] All attempts failed. Last error: ${lastError?.message}`);
}

/**
 * Call LLM and parse the response as JSON.
 * Uses json_mode when available, with fallback extraction.
 */
export async function callLLMForJSON<T>(
  systemPrompt: string,
  userMessage: string,
  options?: {
    model?: string;
    temperature?: number;
  }
): Promise<T> {
  const raw = await callLLM(systemPrompt, userMessage, {
    ...options,
    jsonMode: true,
    temperature: options?.temperature ?? 0.2, // Lower temperature for structured output
  });

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1].trim()) as T;
    }

    // Try to find JSON object in response
    const braceMatch = raw.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]) as T;
    }

    throw new Error(`[Groq] Failed to parse JSON from LLM response: ${raw.slice(0, 200)}`);
  }
}

// ─── Helpers ────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
