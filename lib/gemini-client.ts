/**
 * Gemini AI Client for code analysis and fixes
 */

export interface FileChange {
  filepath: string;
  content: string;
  reason: string;
  isNew: boolean;
}

export interface GeminiCodeAnalysis {
  errors: Array<{
    line: number;
    message: string;
    severity: 'error' | 'warning' | 'info';
    type: string;
  }>;
  fixes: Array<{
    line: number;
    original: string;
    fixed: string;
    reason: string;
  }>;
  fixedCode: string; // Primary file - kept for backward compatibility
  suggestions: string[];
  additionalFiles?: FileChange[]; // New: Additional files that need to be created/modified
}

export async function analyzeCodeWithGemini(
  code: string,
  language: string
): Promise<GeminiCodeAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log('[Gemini] API Key status:', { 
    exists: !!apiKey, 
    length: apiKey?.length,
    preview: apiKey ? `${apiKey.substring(0, 10)}...` : 'missing'
  });
  
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not found in environment variables');
    return null;
  }

  // Retry logic for rate limiting
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`[Gemini] Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      console.log(`[Gemini] Preparing prompt for ${language} (attempt ${attempt}/${maxRetries})`);
    
    const prompt = `You are a universal code analyzer & fixer. Input includes {language} and {code}. 
Output MUST be valid JSON.

Your job: detect errors, fix them, and output fully working, executable code.and dont provide summary only ouptut code

Rules by language:

C++:
- Output FULL compilable code.
- Include all headers.
- Use std:: prefix always.
- Must contain: int main(){... return 0;}
- Fix all syntax, missing braces, includes.
- If headers referenced, generate additionalFiles.

Python:
- Output FULL runnable script.
- PEP8, 4-space indent, type hints, imports, exceptions, f-strings.

Java:
- FULL compilable program.
- Class + public static void main.
- Add imports, fix types and naming.

JS/TS:
- ES6+, const/let, semicolons, ===, arrow functions, try/catch.

General:
- Fix all syntax/logic errors.
- Add needed imports/includes.
- Ensure code runs/compiles without errors.

QUALITY CHECK:
- Entry point exists?
- Imports/includes present?
- No undefined vars?
- Balanced braces?
- Indentation correct?

OUTPUT FORMAT (JSON ONLY):

{
 "errors":[{ "line":1, "message":"...", "severity":"error" }],
 "fixes":[{ "line":1, "original":"...", "fixed":"...", "reason":"..." }],
 "fixedCode":"<FULL WORKING CODE HERE>",
 "suggestions":["...", "..."],
 "additionalFiles":[
   { "filepath":"x.h","content":"...","reason":"...","isNew":true }
 ]
}

fixedCode MUST be fully working for {language}. 
Never return partial code. Always return a complete, compilable version.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Language: ${language}\n\nCode:\n${code}\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    console.log('[Gemini] API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', { status: response.status, error: errorText });
      
      // Handle rate limiting
      if (response.status === 429) {
        throw new Error(`Gemini API rate limit exceeded. Please wait a moment and try again.`);
      }
      
      // Handle quota/billing errors
      if (response.status === 403) {
        throw new Error(`Gemini API key invalid or quota exceeded. Please check your API key at https://makersuite.google.com/app/apikey`);
      }
      
      throw new Error(`Gemini API error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Gemini] Response structure:', JSON.stringify(data, null, 2).substring(0, 500));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[Gemini] Response missing text. Full response:', JSON.stringify(data, null, 2));
      
      // Check for safety blocks
      if (data.candidates?.[0]?.finishReason === 'SAFETY') {
        throw new Error('Gemini blocked the response due to safety filters. Try rephrasing your code.');
      }
      
      throw new Error('No response from Gemini API');
    }

    console.log('[Gemini] Raw response preview:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));

    // Since we set responseMimeType to application/json, response should be JSON
    let analysis: GeminiCodeAnalysis;
    try {
      // Try parsing directly first (for JSON responses)
      analysis = JSON.parse(text);
    } catch {
      // Fallback: Extract JSON from markdown code blocks if present
      let jsonText = text;
      const jsonBlockMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
      if (jsonBlockMatch) {
        jsonText = jsonBlockMatch[1];
      } else {
        // Try to find JSON object
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonText = jsonMatch[0];
        }
      }

      console.log('[Gemini] Extracted JSON preview:', jsonText.substring(0, 300) + (jsonText.length > 300 ? '...' : ''));
      analysis = JSON.parse(jsonText);
    }
    
    // Validate the response
    if (!analysis.fixedCode || !Array.isArray(analysis.errors) || !Array.isArray(analysis.fixes)) {
      console.error('[Gemini] Invalid response structure:', analysis);
      throw new Error('Invalid response format from Gemini - missing required fields');
    }
    
    console.log('[Gemini] ✅ Analysis successful:', {
      errorsCount: analysis.errors.length,
      fixesCount: analysis.fixes.length,
      hasFixedCode: !!analysis.fixedCode,
      fixedCodeLength: analysis.fixedCode.length,
      additionalFiles: analysis.additionalFiles?.length || 0
    });
    
    return analysis;
    
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Gemini] Attempt ${attempt}/${maxRetries} failed:`, lastError.message);
      
      // Don't retry on certain errors
      if (lastError.message.includes('invalid') || 
          lastError.message.includes('quota exceeded') ||
          lastError.message.includes('403')) {
        console.error('[Gemini] Non-retryable error, aborting');
        break;
      }
      
      // Continue to next retry
      if (attempt < maxRetries) {
        continue;
      }
    }
  }
  
  // All retries failed
  console.error('[Gemini] All retry attempts failed:', lastError?.message);
  if (lastError instanceof Error) {
    console.error('[Gemini] Error details:', lastError.message);
  }
  return null;
}
