import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";

interface OrchestratorState {
  filepath: string;
  language: string;
  originalCode: string;
  scannedCode: string;
  fixedCode: string;
  finalCode: string;
  scanResults: {
    errors: Array<{ line: number; message: string; severity: string; type: string }>;
    suggestions: string[];
  };
  fixResults: {
    changes: Array<{ line: number; original: string; fixed: string; reason: string }>;
  };
  editorResults: {
    modifications: Array<{ type: string; description: string; lineStart: number; lineEnd: number }>;
    summary: string;
  };
  currentPhase: "scanning" | "fixing" | "editing" | "complete";
}

/**
 * Synchronous multi-agent orchestrator that runs scanner, fixer, and editor agents
 * Returns complete results immediately (not via Inngest events)
 */
export async function runMultiAgentAnalysis(
  code: string,
  language: string,
  filepath: string = "untitled"
) {
  console.log(`[Orchestrator] Starting synchronous multi-agent analysis`);
  console.log(`[Orchestrator] Language: ${language}, File: ${filepath}`);
  
  const state = createState<OrchestratorState>({
    filepath,
    language,
    originalCode: code,
    scannedCode: code,
    fixedCode: code,
    finalCode: code,
    scanResults: { errors: [], suggestions: [] },
    fixResults: { changes: [] },
    editorResults: { modifications: [], summary: "" },
    currentPhase: "scanning",
  });

  // Scanner Agent
  const scannerAgent = createAgent<OrchestratorState>({
    name: "scanner",
    description: "Scans code for errors and issues",
    system: `You are a code scanner. Analyze code thoroughly and identify ALL errors, warnings, and issues.

CRITICAL: Be extremely thorough. Check:
- Syntax errors (missing semicolons, brackets, etc.)
- Undeclared identifiers
- Wrong operators
- Type mismatches
- Missing includes/imports
- Logic errors

Return comprehensive error list with line numbers.`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "scanCode",
        description: "Scan code for errors and return results",
        parameters: z.object({
          errors: z.array(z.object({
            line: z.number(),
            message: z.string(),
            severity: z.enum(["error", "warning", "info"]),
            type: z.string(),
          })),
          suggestions: z.array(z.string()),
        }),
        handler: async ({ errors, suggestions }, { network }: Tool.Options<OrchestratorState>) => {
          if (network) {
            network.state.data.scanResults = { errors, suggestions };
            network.state.data.currentPhase = "fixing";
            console.log(`[Scanner] Found ${errors.length} errors, ${suggestions.length} suggestions`);
          }
          return `Scan complete: ${errors.length} errors found`;
        },
      }),
    ],
  });

  // Fixer Agent
  const fixerAgent = createAgent<OrchestratorState>({
    name: "fixer",
    description: "Applies automated fixes to code",
    system: `You are a code fixer. Apply fixes based on scan results.

For each error found:
1. Identify the exact line and issue
2. Generate the correct fixed version
3. Document what was changed and why

Generate complete fixed code with ALL errors corrected.`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "applyFixes",
        description: "Apply fixes to the code and return fixed version",
        parameters: z.object({
          fixedCode: z.string().describe("The code with all fixes applied"),
          changes: z.array(z.object({
            line: z.number(),
            original: z.string(),
            fixed: z.string(),
            reason: z.string(),
          })),
        }),
        handler: async ({ fixedCode, changes }, { network }: Tool.Options<OrchestratorState>) => {
          if (network) {
            network.state.data.fixedCode = fixedCode;
            network.state.data.fixResults = { changes };
            network.state.data.currentPhase = "editing";
            console.log(`[Fixer] Applied ${changes.length} fixes`);
          }
          return `Applied ${changes.length} fixes`;
        },
      }),
    ],
  });

  // Editor Agent
  const editorAgent = createAgent<OrchestratorState>({
    name: "editor",
    description: "Makes comprehensive code improvements",
    system: `You are a code editor. Make final improvements to ensure code is perfect, compilable, and follows best practices.

CRITICAL REQUIREMENTS by language:

C++:
- MUST have int main() function (add if missing)
- MUST have #include <iostream> and other necessary headers
- MUST use std::cout with << operator (NOT >>)
- MUST end statements with semicolons
- MUST return 0 from main()
- Code MUST compile without errors

JavaScript/TypeScript:
- Use const/let instead of var
- Use arrow functions
- Proper semicolons
- === instead of ==

Python:
- PEP 8 compliance
- Type hints
- 4-space indentation
- Proper imports

Java:
- Must have public static void main(String[] args)
- Proper class definition
- Necessary imports

Generate COMPLETE, COMPILABLE, RUNNABLE code!`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "improveCode",
        description: "Make final improvements and ensure code quality",
        parameters: z.object({
          finalCode: z.string().describe("Complete, working, compilable code"),
          modifications: z.array(z.object({
            type: z.enum(["fix", "refactor", "optimize"]),
            description: z.string(),
            lineStart: z.number(),
            lineEnd: z.number(),
          })),
          summary: z.string().describe("Summary of all changes made"),
        }),
        handler: async ({ finalCode, modifications, summary }, { network }: Tool.Options<OrchestratorState>) => {
          if (network) {
            network.state.data.finalCode = finalCode;
            network.state.data.editorResults = { modifications, summary };
            network.state.data.currentPhase = "complete";
            console.log(`[Editor] Made ${modifications.length} improvements`);
            console.log(`[Editor] Summary: ${summary}`);
          }
          return `Improvements complete: ${summary}`;
        },
      }),
    ],
  });

  // Create network with all agents
  const network = createNetwork<OrchestratorState>({
    name: "multi-agent-orchestrator-sync",
    agents: [scannerAgent, fixerAgent, editorAgent],
    maxIter: 30,
    defaultState: state,
    router: async ({ network }) => {
      const phase = network.state.data.currentPhase;
      
      console.log(`[Router] Current phase: ${phase}`);
      
      // Route based on current phase
      if (phase === "scanning") {
        console.log('[Router] → Scanner Agent');
        return scannerAgent;
      } else if (phase === "fixing") {
        console.log('[Router] → Fixer Agent');
        return fixerAgent;
      } else if (phase === "editing") {
        console.log('[Router] → Editor Agent');
        return editorAgent;
      } else if (phase === "complete") {
        console.log('[Router] → Complete!');
        return;
      }
      
      return scannerAgent;
    },
  });

  console.log(`[Orchestrator] Running multi-agent network...`);
  
  const result = await network.run(
    `Analyze and fix this ${language} code from "${filepath}":

${code}

WORKFLOW:
1. Scanner: Identify ALL errors
2. Fixer: Fix all errors
3. Editor: Ensure code is complete, compilable, and production-ready

Be thorough!`,
    { state }
  );

  console.log(`[Orchestrator] ===== RESULTS =====`);
  console.log(`[Orchestrator] Errors found: ${result.state.data.scanResults.errors.length}`);
  console.log(`[Orchestrator] Fixes applied: ${result.state.data.fixResults.changes.length}`);
  console.log(`[Orchestrator] Improvements: ${result.state.data.editorResults.modifications.length}`);
  console.log(`[Orchestrator] Final code length: ${result.state.data.finalCode.length}`);
  console.log(`[Orchestrator] ========================`);

  return {
    success: true,
    filepath: result.state.data.filepath,
    originalCode: result.state.data.originalCode,
    finalCode: result.state.data.finalCode,
    scanResults: result.state.data.scanResults,
    fixResults: result.state.data.fixResults,
    editorResults: result.state.data.editorResults,
  };
}
