// ─── DevMind SmartDocs API ────────────────────────────────────
// POST /api/devmind/docs
// Generates a learning report from the user's debug history.

import { NextRequest, NextResponse } from 'next/server';
import { generateSmartDocs } from '@/lib/devmind/llm/chain';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: userId' },
        { status: 400 }
      );
    }

    console.log(`[API/docs] Generating SmartDocs for ${userId}`);

    const report = await generateSmartDocs(userId);

    return NextResponse.json({
      success: true,
      report,
    });
  } catch (error: unknown) {
    console.error('[API/docs] Error:', error);

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
