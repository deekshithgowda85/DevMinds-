import { inngest } from "../client";
import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";

interface DebugAgentState {
  originalCode: string;
  fixedCode: string;
  errors: Array<{
    line: number;
    message: string;
    severity: string;
    type: string;
  }>;
  fixes: Array<{
    line: number;
    original: string;
    fixed: string;
    reason: string;
  }>;
  suggestions: string[];
  language: string;
  isComplete: boolean;
}

const DEBUG_PROMPT = `You are an expert code debugger and fixer. Your job is to:

1. Analyze code for errors, bugs, and issues
2. Provide specific fixes with line numbers
3. Generate complete, working fixed code
4. Explain what was wrong and why your fix works

CRITICAL REQUIREMENTS:
- For C++: MUST include int main(), #include directives, std:: prefix, proper semicolons, << operator for output (NOT >>)
- For JavaScript/TypeScript: Use modern syntax (const/let, arrow functions), proper semicolons, === instead of ==
- For Python: Follow PEP 8, use type hints, proper indentation (4 spaces)
- For Java: Include public static void main, proper class definition, imports

IMPORTANT - GENERATE PERFECT CODE EVERY TIME:
- Check EVERY line for syntax errors
- Add ALL missing semicolons
- Use CORRECT operators (<< for C++ output, not >>)
- Add ALL necessary includes/imports
- Qualify ALL standard library items (std::cout not cout)
- Create main() function if missing
- Code MUST compile/run without ANY errors

QUALITY CHECKLIST:
✓ All semicolons present?
✓ All operators correct?
✓ All identifiers qualified?
✓ All includes/imports present?
✓ Main function present?
✓ Code will compile?

Your output MUST be structured and complete. The fixed code MUST compile/run without errors.

When you've completed your analysis, use the completeDebug tool to save your results.`;

export const debugAgentFunction = inngest.createFunction(
  { id: "debug-agent" },
  { event: "debug/analyze" },
  async ({ event }) => {
    
    const state = createState<DebugAgentState>({
      originalCode: event.data.code,
      fixedCode: event.data.code,
      errors: [],
      fixes: [],
      suggestions: [],
      language: event.data.language,
      isComplete: false,
    });

    const debugAgent = createAgent<DebugAgentState>({
      name: "debug-agent",
      description: `An expert ${event.data.language} code debugger and fixer`,
      system: DEBUG_PROMPT,
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
      }),
      tools: [
        createTool({
          name: "analyzeCode",
          description: "Analyze code to identify errors, warnings, and issues. Use this first to understand what's wrong.",
          parameters: z.object({
            errors: z.array(z.object({
              line: z.number().describe("Line number where error occurs"),
              message: z.string().describe("Description of the error"),
              severity: z.enum(["error", "warning", "info"]),
              type: z.string().describe("Type of error: syntax, logic, best-practice, etc."),
            })),
            suggestions: z.array(z.string()).describe("General suggestions for improving the code"),
          }),
          handler: async ({ errors, suggestions }, { network }: Tool.Options<DebugAgentState>) => {
            if (network) {
              network.state.data.errors = errors;
              network.state.data.suggestions = suggestions;
            }
            return `Analyzed code: Found ${errors.length} issues. Suggestions: ${suggestions.join(", ")}`;
          },
        }),

        createTool({
          name: "generateFixes",
          description: "Generate specific fixes for the identified errors. Use this after analyzing.",
          parameters: z.object({
            fixes: z.array(z.object({
              line: z.number().describe("Line number being fixed"),
              original: z.string().describe("Original problematic code"),
              fixed: z.string().describe("Fixed version of the code"),
              reason: z.string().describe("Explanation of why this fix is needed"),
            })),
          }),
          handler: async ({ fixes }, { network }: Tool.Options<DebugAgentState>) => {
            if (network) {
              network.state.data.fixes = fixes;
            }
            return `Generated ${fixes.length} fixes for the code issues.`;
          },
        }),

        createTool({
          name: "generateFixedCode",
          description: "Generate the complete fixed version of the code. This must be compilable/runnable code with ALL fixes applied.",
          parameters: z.object({
            fixedCode: z.string().describe("Complete fixed code that compiles and runs without errors"),
          }),
          handler: async ({ fixedCode }, { network }: Tool.Options<DebugAgentState>) => {
            if (network) {
              network.state.data.fixedCode = fixedCode;
            }
            return "Fixed code has been generated and saved.";
          },
        }),

        createTool({
          name: "completeDebug",
          description: "Mark the debug process as complete after analyzing, generating fixes, and creating fixed code.",
          parameters: z.object({
            summary: z.string().describe("Summary of what was fixed and how"),
          }),
          handler: async ({ summary }, { network }: Tool.Options<DebugAgentState>) => {
            if (network) {
              network.state.data.isComplete = true;
              network.state.data.suggestions.push(summary);
            }
            return "Debug process completed successfully!";
          },
        }),
      ],
    });

    const network = createNetwork<DebugAgentState>({
      name: "debug-agent-network",
      agents: [debugAgent],
      maxIter: 10,
      defaultState: state,
      router: async ({ network }) => {
        // Stop if debug is complete
        if (network.state.data.isComplete) {
          return;
        }
        return debugAgent;
      },
    });

    const result = await network.run(
      `Analyze and fix this ${event.data.language} code:\n\n${event.data.code}\n\nProvide detailed error analysis, specific fixes, and generate complete working code.`,
      { state }
    );

    return {
      success: true,
      analysis: {
        errors: result.state.data.errors,
        fixes: result.state.data.fixes,
        suggestions: result.state.data.suggestions,
        fixedCode: result.state.data.fixedCode,
      },
    };
  }
);
