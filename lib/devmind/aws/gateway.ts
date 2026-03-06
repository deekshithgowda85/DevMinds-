// ─── AWS API Gateway Proxy ──────────────────────────────────────────────────
// Utility to call DevMind Lambda via API Gateway
// Falls back to local Groq pipeline if gateway is not configured
// 
// Environment variable: API_GATEWAY_URL (or AWS_API_GATEWAY_URL for local dev)
// AWS Amplify blocks env vars starting with "AWS_", so use API_GATEWAY_URL in production

const GATEWAY_URL = process.env.API_GATEWAY_URL || process.env.AWS_API_GATEWAY_URL;

export interface GatewayRequest {
  userId: string;
  language: string;
  code: string;
  error?: string;
  actionType: 'fix' | 'explain' | 'quiz' | 'docs';
}

export interface GatewayResponse {
  success: boolean;
  data?: Record<string, unknown>;
  meta?: {
    cached: boolean;
    modelUsed: string;
    tokenCount: number;
    latencyMs?: number;
  };
  error?: string;
}

/**
 * Call the DevMind AWS Lambda via API Gateway
 * Returns null if gateway is not configured (caller should fall back to local)
 */
export async function callGateway(request: GatewayRequest): Promise<GatewayResponse | null> {
  if (!GATEWAY_URL) {
    console.log('[Gateway] API_GATEWAY_URL not set, using local pipeline');
    return null;
  }

  const url = `${GATEWAY_URL}/analyze`;
  console.log(`[Gateway] Calling: ${url} (action: ${request.actionType})`);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      console.error(`[Gateway] HTTP ${res.status}: ${res.statusText}`);
      return null; // Let caller fall back to local
    }

    const data: GatewayResponse = await res.json();
    console.log(`[Gateway] Response: cached=${data.meta?.cached}, model=${data.meta?.modelUsed}`);
    return data;
  } catch (err) {
    console.error('[Gateway] Network error:', (err as Error).message);
    return null; // Fall back to local
  }
}

/**
 * Check if the AWS Gateway is configured
 */
export function isGatewayConfigured(): boolean {
  return !!GATEWAY_URL;
}
