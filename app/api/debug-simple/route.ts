import { NextRequest, NextResponse } from "next/server";
import { getSandboxInstance } from "@/lib/sandbox-instances";

/**
 * Simple debug endpoint - NO AI USAGE
 * Just executes code in sandbox and returns results
 * No Gemini API calls, no agents, no analysis
 * Perfect for quick testing without consuming API quota
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, language, filepath, sessionId, stdin } = body;

    if (!code || !language) {
      return NextResponse.json(
        { error: "Missing required fields: code, language" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing sessionId for code execution" },
        { status: 400 }
      );
    }

    console.log(`[Simple Debug] Executing ${language} code without AI analysis...`);
    console.log(`[Simple Debug] File: ${filepath || 'untitled'}`);
    console.log(`[Simple Debug] Filepath param:`, filepath);
    console.log(`[Simple Debug] Filepath type:`, typeof filepath);
    console.log(`[Simple Debug] SessionId: ${sessionId}`);

    // Get existing sandbox from session
    console.log('[Simple Debug] Looking up sandbox instance...');
    const sandbox = getSandboxInstance(sessionId);
    console.log('[Simple Debug] Sandbox found:', !!sandbox);
    
    if (!sandbox) {
      console.error('[Simple Debug] ❌ Sandbox not found for sessionId:', sessionId);
      return NextResponse.json(
        { error: "Sandbox session not found. Please initialize first." },
        { status: 404 }
      );
    }
    
    console.log('[Simple Debug] ✅ Sandbox instance retrieved successfully');
    
    // Execute code based on language
    let executionResult = {
      executed: true,
      success: false,
      stdout: "",
      stderr: "",
      exitCode: -1,
      executionTime: 0,
      errorMessage: "",
    };

    const startTime = Date.now();

    try {
      const result = await sandbox.executeCode(language, code, filepath, stdin);
      executionResult = {
        executed: true,
        success: result.exitCode === 0,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        executionTime: Date.now() - startTime,
        errorMessage: result.error || "",
      };
    } catch (error) {
      executionResult.executed = true;
      executionResult.success = false;
      executionResult.errorMessage = error instanceof Error ? error.message : "Execution failed";
      executionResult.stderr = executionResult.errorMessage;
      executionResult.exitCode = 1;
      executionResult.executionTime = Date.now() - startTime;
    }

    console.log(`[Simple Debug] ✅ Execution complete!`);
    console.log(`[Simple Debug] Success: ${executionResult.success ? '✅' : '❌'}`);
    console.log(`[Simple Debug] Exit Code: ${executionResult.exitCode}`);
    console.log(`[Simple Debug] Execution Time: ${executionResult.executionTime}ms`);

    return NextResponse.json({
      executionResults: executionResult,
      scanResults: {
        errors: [],
        suggestions: ["Code executed without AI analysis"],
      },
      fixResults: {
        changes: [],
      },
      editorResults: {
        modifications: [],
        summary: "Simple debug mode - no AI modifications applied",
      },
    });
  } catch (error) {
    console.error("[Simple Debug] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to execute code",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
