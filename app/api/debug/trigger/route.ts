import { NextRequest, NextResponse } from "next/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, filepath, sessionId, maxIterations = 3 } = body;

    if (!code || !language || !filepath || !sessionId) {
      return NextResponse.json(
        { error: "Missing required fields: code, language, filepath, sessionId" },
        { status: 400 }
      );
    }

    // Trigger the Inngest workflow
    const eventId = await inngest.send({
      name: "debug/start",
      data: {
        code,
        language,
        filepath,
        sessionId,
        maxIterations,
      },
    });

    return NextResponse.json({
      success: true,
      eventId,
      message: "Debug workflow triggered successfully",
    });
  } catch (error) {
    console.error("Error triggering debug workflow:", error);
    return NextResponse.json(
      {
        error: "Failed to trigger workflow",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
