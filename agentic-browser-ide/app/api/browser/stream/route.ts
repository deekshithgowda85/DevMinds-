// OLD STREAMING ENDPOINT - DEPRECATED
// Replaced by /api/stream/live with Server-Sent Events
// This stub prevents accidental usage

import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    error: 'Deprecated endpoint. Use /api/stream/live instead.',
    success: false,
  }, { status: 410 });
}

export async function GET() {
  return NextResponse.json({
    error: 'Deprecated endpoint. Use /api/stream/live instead.',
    success: false,
  }, { status: 410 });
}
