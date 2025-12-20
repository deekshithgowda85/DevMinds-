import { ScanResult } from "../client";
import { analyzeCodeWithGemini } from "@/lib/gemini-client";

export class ScannerAgent {
  async scan(
    code: string,
    language: string,
    sessionId: string
  ): Promise<ScanResult> {
    console.log(`[Scanner] Analyzing ${language} code in session ${sessionId} - USING GEMINI AI ONLY`);
    
    const errors: ScanResult["errors"] = [];
    const suggestions: string[] = [];

    try {
      // ONLY use Gemini AI for comprehensive analysis - NO pattern-based fallbacks
      console.log('[Scanner] 🤖 Calling Gemini AI for code analysis...');
      const geminiAnalysis = await analyzeCodeWithGemini(code, language);
      
      if (geminiAnalysis && geminiAnalysis.errors) {
        console.log(`[Scanner] ✅ Gemini found ${geminiAnalysis.errors.length} issues`);
        
        // Use Gemini's errors
        geminiAnalysis.errors.forEach((err) => {
          errors.push({
            line: err.line,
            column: 0,
            message: err.message,
            severity: err.severity as 'error' | 'warning' | 'info',
            type: err.type,
          });
        });
        
        // Use Gemini's suggestions
        if (geminiAnalysis.suggestions) {
          suggestions.push(...geminiAnalysis.suggestions);
        }
        
        console.log(`[Scanner] Using AI analysis: ${errors.length} errors, ${suggestions.length} suggestions`);
        
        return {
          errors,
          suggestions,
          timestamp: Date.now(),
        };
      }
      
      // NO FALLBACK - If Gemini fails, return error
      console.error('[Scanner] ❌ Gemini AI not available - CANNOT analyze without AI');
      
      errors.push({
        line: 1,
        column: 0,
        message: 'Gemini AI is required for code analysis. Please ensure GEMINI_API_KEY is set in .env.local and restart the server.',
        severity: 'error',
        type: 'config',
      });

      return {
        errors,
        suggestions: ['Set up Gemini AI to enable code analysis'],
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[Scanner] Error during scanning:", error);
      throw error;
    }
  }
}
