// ─── DevMind SmartDocs API ────────────────────────────────────
// POST /api/devmind/docs
// Generates a learning report from the user's debug history.

import { NextRequest, NextResponse } from 'next/server';
import { generateSmartDocs } from '@/lib/devmind/llm/chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body as Record<string, unknown>;

    if (typeof userId !== 'string' || !userId.trim()) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid required field: userId (must be a non-empty string)' },
        { status: 400 }
      );
    }

    console.log(`[API/docs] Generating SmartDocs (userId length: ${userId.length})`);

    const report = await generateSmartDocs(userId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    console.error('[API/docs] Internal error occurred');

    return NextResponse.json(
      { success: false, error: 'An internal error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
