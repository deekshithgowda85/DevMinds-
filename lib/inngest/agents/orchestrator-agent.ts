import { inngest } from "../client";
import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";

interface OrchestratorState {
  sessionId: string;
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

const ORCHESTRATOR_PROMPT = `You are the orchestrator of a multi-agent code analysis and fixing system.

Your role is to coordinate three specialized agents:
1. **Scanner Agent** - Analyzes code to find errors and issues
2. **Fixer Agent** - Applies automated fixes to common problems  
3. **Editor Agent** - Makes comprehensive improvements and ensures code quality

WORKFLOW:
1. Use scanCode to analyze the code for errors
2. Use applyFixes to automatically fix common issues
3. Use improveCode to make final improvements and ensure quality
4. Use complete to finalize the process

Each step should use the results from the previous step.`;

export const orchestratorAgentFunction = inngest.createFunction(
  { id: "orchestrator-agent" },
  { event: "code/analyze" },
  async ({ event }) => {
    
    console.log(`[Orchestrator] Starting multi-agent analysis`);
    console.log(`[Orchestrator] Language: ${event.data.language}, File: ${event.data.filepath}`);
    
    const state = createState<OrchestratorState>({
      sessionId: event.data.sessionId || "unknown",
      filepath: event.data.filepath || "untitled",
      language: event.data.language,
      originalCode: event.data.code,
      scannedCode: event.data.code,
      fixedCode: event.data.code,
      finalCode: event.data.code,
      scanResults: { errors: [], suggestions: [] },
      fixResults: { changes: [] },
      editorResults: { modifications: [], summary: "" },
      currentPhase: "scanning",
    });

    const scannerAgent = createAgent<OrchestratorState>({
      name: "scanner",
      description: "Scans code for errors and issues",
      system: "You are a code scanner. Analyze code and identify all errors, warnings, and issues.",
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
              console.log(`[Scanner Agent] Found ${errors.length} errors, ${suggestions.length} suggestions`);
            }
            return `Scan complete: ${errors.length} errors found`;
          },
        }),
      ],
    });

    const fixerAgent = createAgent<OrchestratorState>({
      name: "fixer",
      description: "Applies automated fixes to code",
      system: "You are a code fixer. Apply fixes based on scan results.",
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
      }),
      tools: [
        createTool({
          name: "applyFixes",
          description: "Apply fixes to the code and return fixed version",
          parameters: z.object({
            fixedCode: z.string(),
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
              console.log(`[Fixer Agent] Applied ${changes.length} fixes`);
            }
            return `Applied ${changes.length} fixes`;
          },
        }),
      ],
    });

    const editorAgent = createAgent<OrchestratorState>({
      name: "editor",
      description: "Makes comprehensive code improvements",
      system: `You are a code editor. Make final improvements to ensure code is perfect, compilable, and follows best practices.

CRITICAL: For C++ code:
- MUST have int main() function
- MUST have #include <iostream>
- MUST use std::cout with << operator (NOT >>)
- MUST end statements with semicolons
- MUST return 0 from main()`,
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
            summary: z.string(),
          }),
          handler: async ({ finalCode, modifications, summary }, { network }: Tool.Options<OrchestratorState>) => {
            if (network) {
              network.state.data.finalCode = finalCode;
              network.state.data.editorResults = { modifications, summary };
              network.state.data.currentPhase = "complete";
              console.log(`[Editor Agent] Made ${modifications.length} improvements`);
              console.log(`[Editor Agent] Summary: ${summary}`);
            }
            return `Improvements complete: ${summary}`;
          },
        }),
      ],
    });

    const network = createNetwork<OrchestratorState>({
      name: "multi-agent-orchestrator",
      agents: [scannerAgent, fixerAgent, editorAgent],
      maxIter: 30,
      defaultState: state,
      router: async ({ network }) => {
        const phase = network.state.data.currentPhase;
        
        console.log(`[Orchestrator Router] Phase: ${phase}`);
        
        // Route based on current phase
        if (phase === "scanning") {
          console.log('[Orchestrator Router] -> Scanner Agent');
          return scannerAgent;
        } else if (phase === "fixing") {
          console.log('[Orchestrator Router] -> Fixer Agent');
          return fixerAgent;
        } else if (phase === "editing") {
          console.log('[Orchestrator Router] -> Editor Agent');
          return editorAgent;
        } else if (phase === "complete") {
          console.log('[Orchestrator Router] -> Complete! Stopping.');
          return;
        }
        
        // Default to scanner if somehow we get here
        return scannerAgent;
      },
    });

    console.log(`[Orchestrator] Starting multi-agent network for ${event.data.language} code...`);
    
    const result = await network.run(
      `Analyze and fix this ${event.data.language} code from "${event.data.filepath}":\n\n${event.data.code}\n\nPerform scanning, fixing, and editing in sequence.`,
      { state }
    );

    console.log(`[Orchestrator] ===== MULTI-AGENT COMPLETION =====`);
    console.log(`[Orchestrator] Errors found: ${result.state.data.scanResults.errors.length}`);
    console.log(`[Orchestrator] Fixes applied: ${result.state.data.fixResults.changes.length}`);
    console.log(`[Orchestrator] Improvements: ${result.state.data.editorResults.modifications.length}`);
    console.log(`[Orchestrator] Final code length: ${result.state.data.finalCode.length}`);
    console.log(`[Orchestrator] ================================`);

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
);
