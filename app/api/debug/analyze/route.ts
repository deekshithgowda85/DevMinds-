import { NextRequest, NextResponse } from "next/server";
import { analyzeCodeWithGemini } from "@/lib/gemini-client";

export async function POST(request: NextRequest) {
  try {
    const { code, language } = await request.json();

    console.log('Debug analyze API called:', { language, codeLength: code?.length });

    if (!code || !language) {
      console.error('Missing required parameters:', { hasCode: !!code, hasLanguage: !!language });
      return NextResponse.json(
        { error: "Missing required fields: code, language" },
        { status: 400 }
      );
    }

    const analysis = await analyzeCodeWithGemini(code, language);

    if (!analysis) {
      console.log('Gemini analysis returned null (API key missing or API error)');
      return NextResponse.json(
        {
          error: "Gemini API not configured or failed",
          fallback: true,
        },
        { status: 200 } // Return 200 so frontend can use fallback
      );
    }

    console.log('Gemini analysis successful, returning result');
    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Error analyzing code with Gemini:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze code",
        details: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      },
      { status: 200 } // Return 200 so frontend can use fallback
    );
  }
}
