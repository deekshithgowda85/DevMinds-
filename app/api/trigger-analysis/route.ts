import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, code, language, filepath } = body;

    if (!sessionId || !code || !language) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, code, language" },
        { status: 400 }
      );
    }

    console.log(`[Trigger] Starting multi-agent analysis for ${language} file: ${filepath}`);

    // Trigger the multi-agent orchestrator
    const eventId = await inngest.send({
      name: "code/analyze",
      data: {
        sessionId,
        code,
        language,
        filepath: filepath || "untitled",
      },
    });

    console.log(`[Trigger] Event sent successfully:`, eventId);

    return NextResponse.json({
      success: true,
      message: "Multi-agent analysis started",
      eventId,
    });
  } catch (error) {
    console.error("[Trigger] Error triggering analysis:", error);
    return NextResponse.json(
      { error: "Failed to trigger analysis", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
