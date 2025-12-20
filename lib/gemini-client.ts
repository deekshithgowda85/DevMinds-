/**
 * Gemini AI Client for code analysis and fixes
 */

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
  fixedCode: string;
  suggestions: string[];
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

  try {
    console.log('[Gemini] Preparing prompt for', language);
    
    const prompt = `You are an expert code analyzer and fixer for ALL programming languages. Your task is to analyze code and provide a COMPLETE, WORKING, COMPILABLE/EXECUTABLE version.

ORIGINAL CODE (${language}):
\`\`\`${language}
${code}
\`\`\`

CRITICAL REQUIREMENTS FOR ALL LANGUAGES:

${language === 'cpp' || language === 'c++' ? `
C++ REQUIREMENTS:
- MUST produce COMPLETE, COMPILABLE C++ code
- MUST include: int main() { ... return 0; }
- MUST include all necessary headers: #include <iostream>, #include <string>, etc.
- Use std::cout, std::cin, std::endl (with std:: prefix) - NEVER use bare cout
- Use << operator for output (NEVER use >> for output)
- Add ALL missing semicolons at end of statements
- Ensure ALL braces are balanced { }
- Properly qualify all standard library functions (std::)
- If the code has a function but no main(), CREATE a main() that calls it
- The fixedCode MUST compile with g++/clang++ without ANY errors
- DO NOT leave any syntax errors or undefined identifiers
` : language === 'python' ? `
PYTHON REQUIREMENTS:
- MUST produce COMPLETE, EXECUTABLE Python code
- Follow PEP 8 style guide strictly
- Use proper indentation (4 spaces, NO tabs)
- Add type hints for function parameters and return values
- Handle exceptions properly with try/except
- Use meaningful variable names following snake_case
- Add proper imports (import statements at top)
- Ensure proper string formatting (use f-strings)
- Code MUST run with python3 without errors
` : language === 'java' ? `
JAVA REQUIREMENTS:
- MUST produce COMPLETE, COMPILABLE Java code
- MUST have: public static void main(String[] args)
- Include proper class definition with matching filename
- Add all necessary imports (java.util.*, java.io.*, etc.)
- Use proper Java naming conventions (CamelCase for classes, camelCase for methods)
- Add proper access modifiers (public, private, protected)
- Ensure all variables are properly declared with types
- Add proper exception handling
- Code MUST compile with javac without errors
` : language === 'javascript' || language === 'typescript' ? `
JAVASCRIPT/TYPESCRIPT REQUIREMENTS:
- Use modern ES6+ syntax
- Use const/let instead of var (NEVER use var)
- Add semicolons consistently at end of statements
- Use === instead of == for comparisons
- Use arrow functions where appropriate
- Add proper error handling with try/catch
- Use template literals for string interpolation
- For TypeScript: Add proper type annotations
- Ensure all functions return appropriate types
` : `
GENERAL REQUIREMENTS:
- Produce complete, working code
- Fix all syntax errors
- Add missing imports/includes
- Follow language best practices
- Code MUST compile/run without errors
`}

QUALITY CHECKLIST (verify before generating fixedCode):
✓ All necessary imports/includes present?
✓ Main function/entry point present (if required)?
✓ All semicolons/statement terminators present?
✓ All operators correct?
✓ All identifiers properly qualified?
✓ All variables declared?
✓ All braces/parentheses balanced?
✓ Proper indentation?
✓ Will this code compile/run without errors?

RESPONSE FORMAT (JSON ONLY - NO OTHER TEXT):
{
  "errors": [
    { "line": 1, "message": "Description", "severity": "error", "type": "syntax" }
  ],
  "fixes": [
    { "line": 1, "original": "old code", "fixed": "new code", "reason": "explanation" }
  ],
  "fixedCode": "THE COMPLETE FIXED CODE HERE - MUST BE COMPILABLE/EXECUTABLE",
  "suggestions": ["improvement 1", "improvement 2"]
}

CRITICAL: 
- fixedCode MUST be COMPLETE and WORKING for ${language}
- Include ALL necessary boilerplate (main function, imports, etc)
- The code MUST compile/run without ANY errors
- Do NOT return incomplete code
- Do NOT return the original code if it has errors - FIX IT COMPLETELY
- Be thorough - check EVERY line for issues`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
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
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    console.log('[Gemini] API response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Gemini] API error:', { status: response.status, error: errorText });
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      console.error('[Gemini] Response missing text. Full response:', JSON.stringify(data, null, 2));
      throw new Error('No response from Gemini');
    }

    console.log('[Gemini] Raw response preview:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));

    // Extract JSON from markdown code blocks if present
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
    const analysis: GeminiCodeAnalysis = JSON.parse(jsonText);
    
    // Validate the response
    if (!analysis.fixedCode || !Array.isArray(analysis.errors) || !Array.isArray(analysis.fixes)) {
      console.error('[Gemini] Invalid response structure:', analysis);
      throw new Error('Invalid response format from Gemini');
    }
    
    console.log('[Gemini] Analysis successful:', {
      errorsCount: analysis.errors.length,
      fixesCount: analysis.fixes.length,
      hasFixedCode: !!analysis.fixedCode,
      fixedCodeLength: analysis.fixedCode.length
    });
    
    return analysis;
  } catch (error) {
    console.error('[Gemini] API error:', error);
    if (error instanceof Error) {
      console.error('[Gemini] Error details:', error.message);
    }
    return null;
  }
}
