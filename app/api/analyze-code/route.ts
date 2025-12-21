import { NextRequest, NextResponse } from "next/server";
import { runMultiAgentAnalysis } from "@/lib/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, filepath, sessionId } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields: code, language" },
        { status: 400 }
      );
    }

    console.log(`[API] Starting multi-agent analysis for ${language} code...`);
    console.log(`[API] File: ${filepath || 'untitled'}`);
    console.log(`[API] SessionId: ${sessionId || 'none - execution disabled'}`);
    
    // Run synchronous multi-agent orchestrator with sessionId for execution
    const result = await runMultiAgentAnalysis(code, language, filepath || "untitled", sessionId);

    console.log(`[API] ✅ Multi-agent analysis complete!`);
    console.log(`[API] Errors: ${result.scanResults.errors.length}, Fixes: ${result.fixResults.changes.length}, Improvements: ${result.editorResults.modifications.length}`);
    console.log(`[API] Execution: ${result.executionResults.executed ? (result.executionResults.success ? '✅ SUCCESS' : '❌ FAILED') : '⚠️ SKIPPED'}`);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[API] Error in multi-agent analysis:", error);
    return NextResponse.json(
      { 
        error: "Failed to analyze code",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
