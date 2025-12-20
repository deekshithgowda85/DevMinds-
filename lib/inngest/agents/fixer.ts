import { ScanResult, FixResult } from "../client";
import { analyzeCodeWithGemini } from "@/lib/gemini-client";

export class FixerAgent {
  async fix(
    code: string,
    scanResult: ScanResult,
    language: string,
    sessionId: string
  ): Promise<FixResult> {
    console.log(
      `[Fixer] Applying fixes for ${scanResult.errors.length} errors in session ${sessionId} - USING GEMINI AI ONLY`
    );

    const changes: FixResult["changes"] = [];
    let fixedCode = code;

    try {
      // ONLY use Gemini AI for intelligent code fixes - NO pattern-based fallbacks
      console.log('[Fixer] 🤖 Calling Gemini AI to fix code...');
      const geminiAnalysis = await analyzeCodeWithGemini(code, language);
      
      if (geminiAnalysis && geminiAnalysis.fixedCode) {
        console.log(`[Fixer] ✅ Gemini generated fixed code (${geminiAnalysis.fixes?.length || 0} fixes)`);
        
        fixedCode = geminiAnalysis.fixedCode;
        
        // Use Gemini's fix descriptions
        if (geminiAnalysis.fixes) {
          geminiAnalysis.fixes.forEach((fix) => {
            changes.push({
              line: fix.line,
              original: fix.original,
              fixed: fix.fixed,
              reason: fix.reason,
            });
          });
        }
        
        console.log(`[Fixer] Applied ${changes.length} AI-generated fixes`);
        
        return {
          originalCode: code,
          changes,
          fixedCode,
          timestamp: Date.now(),
        };
      }
      
      // NO FALLBACK - If Gemini fails, return original code with error
      console.error('[Fixer] ❌ Gemini AI not available - CANNOT fix code without AI');
      
      return {
        originalCode: code,
        changes: [{
          line: 1,
          original: code.split('\n')[0] || '',
          fixed: code.split('\n')[0] || '',
          reason: 'Gemini AI is required for code fixes. Please ensure GEMINI_API_KEY is set in .env.local and restart the server.',
        }],
        fixedCode: code, // Return original code unchanged
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[Fixer] Error applying fixes:", error);
      throw error;
    }
  }
}
