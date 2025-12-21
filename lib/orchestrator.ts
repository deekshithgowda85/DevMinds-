import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";
import { FileChange, analyzeCodeWithGemini } from "./gemini-client";

interface OrchestratorState {
  filepath: string;
  language: string;
  originalCode: string;
  scannedCode: string;
  fixedCode: string;
  finalCode: string;
  additionalFiles: FileChange[]; // New: Support for multi-file changes
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
  executionResults: {
    executed: boolean;
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTime: number;
    errorMessage?: string;
  };
  currentPhase: "scanning" | "fixing" | "editing" | "validating" | "complete";
}

/**
 * Synchronous multi-agent orchestrator that runs scanner, fixer, and editor agents
 * Returns complete results immediately (not via Inngest events)
 * OPTIMIZED: Calls Gemini once at the start, shares results across agents
 */
export async function runMultiAgentAnalysis(
  code: string,
  language: string,
  filepath: string = "untitled",
  sessionId?: string
) {
  console.log(`[Orchestrator] Starting synchronous multi-agent analysis`);
  console.log(`[Orchestrator] Language: ${language}, File: ${filepath}`);
  
  // 🚀 OPTIMIZATION: Call Gemini once here, not in each agent
  console.log(`[Orchestrator] 🤖 Calling Gemini AI once for comprehensive analysis...`);
  const geminiAnalysis = await analyzeCodeWithGemini(code, language);
  
  if (!geminiAnalysis) {
    console.error('[Orchestrator] ❌ Gemini analysis failed');
    throw new Error('Failed to analyze code with Gemini AI. Please check your API key.');
  }
  
  console.log(`[Orchestrator] ✅ Gemini analysis complete:`);
  console.log(`  - Errors found: ${geminiAnalysis.errors.length}`);
  console.log(`  - Fixes applied: ${geminiAnalysis.fixes.length}`);
  console.log(`  - Additional files: ${geminiAnalysis.additionalFiles?.length || 0}`);
  
  const state = createState<OrchestratorState>({
    filepath,
    language,
    originalCode: code,
    scannedCode: code,
    fixedCode: code,
    finalCode: code,
    additionalFiles: [], // Initialize empty array for additional files
    scanResults: { errors: [], suggestions: [] },
    fixResults: { changes: [] },
    editorResults: { modifications: [], summary: "" },
    executionResults: {
      executed: false,
      success: false,
      stdout: "",
      stderr: "",
      exitCode: -1,
      executionTime: 0,
    },
    currentPhase: "scanning",
  });

  // Scanner Agent - Reports pre-analyzed results (NO GEMINI CALL)
  const scannerAgent = createAgent<OrchestratorState>({
    name: "scanner",
    description: "Reports scan results from Gemini analysis",
    system: `You are a reporting agent. The code has ALREADY been analyzed by Gemini AI.

Simply acknowledge and use the scanCode tool to proceed.`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "scanCode",
        description: "Report Gemini scan results",
        parameters: z.object({
          acknowledged: z.boolean().describe("Acknowledge scan results"),
        }),
        handler: async ({ acknowledged }, { network }: Tool.Options<OrchestratorState>) => {
          if (network && acknowledged) {
            network.state.data.scanResults = {
              errors: geminiAnalysis.errors.map(e => ({
                line: e.line,
                message: e.message,
                severity: e.severity,
                type: e.type
              })),
              suggestions: geminiAnalysis.suggestions || []
            };
            network.state.data.currentPhase = "fixing";
            console.log(`[Scanner] Reported ${geminiAnalysis.errors.length} errors from Gemini`);
          }
          return `Reported ${geminiAnalysis.errors.length} errors`;
        },
      }),
    ],
  });

  // Fixer Agent - Reports pre-analyzed fixes (NO GEMINI CALL)
  const fixerAgent = createAgent<OrchestratorState>({
    name: "fixer",
    description: "Reports fixes from Gemini analysis",
    system: `You are a reporting agent. The code has ALREADY been fixed by Gemini AI.

Simply acknowledge and use the applyFixes tool to proceed.`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "applyFixes",
        description: "Report Gemini fixes",
        parameters: z.object({
          acknowledged: z.boolean().describe("Acknowledge fixes"),
        }),
        handler: async ({ acknowledged }, { network }: Tool.Options<OrchestratorState>) => {
          if (network && acknowledged) {
            network.state.data.fixResults = {
              changes: geminiAnalysis.fixes.map(f => ({
                line: f.line,
                original: f.original,
                fixed: f.fixed,
                reason: f.reason
              }))
            };
            network.state.data.fixedCode = geminiAnalysis.fixedCode;
            network.state.data.currentPhase = "editing";
            console.log(`[Fixer] Reported ${geminiAnalysis.fixes.length} fixes from Gemini`);
          }
          return `Reported ${geminiAnalysis.fixes.length} fixes`;
        },
      }),
    ],
  });

  // Editor Agent - Reports final code (NO GEMINI CALL)
  const editorAgent = createAgent<OrchestratorState>({
    name: "editor",
    description: "Reports final code from Gemini analysis",
    system: `You are a reporting agent. The code has ALREADY been finalized by Gemini AI.

Simply acknowledge and use the improveCode tool to proceed.`,
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "improveCode",
        description: "Report final code from Gemini",
        parameters: z.object({
          acknowledged: z.boolean().describe("Acknowledge final code"),
        }),
        handler: async ({ acknowledged }, { network }: Tool.Options<OrchestratorState>) => {
          if (network && acknowledged) {
            network.state.data.finalCode = geminiAnalysis.fixedCode;
            network.state.data.additionalFiles = geminiAnalysis.additionalFiles || [];
            network.state.data.editorResults = {
              modifications: geminiAnalysis.fixes.map(f => ({
                type: 'fix' as const,
                description: f.reason,
                lineStart: f.line,
                lineEnd: f.line
              })),
              summary: `Applied ${geminiAnalysis.fixes.length} fixes. ${geminiAnalysis.additionalFiles?.length ? `Created ${geminiAnalysis.additionalFiles.length} additional files.` : ''}`
            };
            network.state.data.currentPhase = "validating";
            console.log(`[Editor] Reported final code from Gemini (${geminiAnalysis.fixedCode.length} chars, ${geminiAnalysis.additionalFiles?.length || 0} additional files)`);
          }
          return `Final code ready: ${geminiAnalysis.fixedCode.length} chars, ${geminiAnalysis.additionalFiles?.length || 0} additional files`;
        },
      }),
    ],
  });

  // Validator Agent - Analyzes execution results (NO GEMINI CALL - just logic)
  const validatorAgent = createAgent<OrchestratorState>({
    name: "validator",
    description: "Analyzes code execution results and validates the code ran successfully",
    system: ({ network }) => {
      const results = network?.state.data.executionResults;
      return `You are a code execution validator. You will receive execution results from the code that was run.

EXECUTION RESULTS:
- Executed: ${results?.executed}
- Success: ${results?.success}
- Exit Code: ${results?.exitCode}
- Execution Time: ${results?.executionTime}ms
- Standard Output:\n${results?.stdout || '(empty)'}
- Standard Error:\n${results?.stderr || '(empty)'}
${results?.errorMessage ? `- Error Message: ${results.errorMessage}` : ''}

Analyze the results and determine:
- Did the code compile successfully (for compiled languages)?
- Did it execute without runtime errors?
- What was the output?
- Was the exit code 0 (success)?

IMPORTANT: You do NOT execute code yourself. The code has already been executed. Just analyze the results provided above.`;
    },
    model: gemini({
      model: "gemini-2.5-flash",
      apiKey: process.env.GEMINI_API_KEY!,
    }),
    tools: [
      createTool({
        name: "reportExecution",
        description: "Report the actual execution results from running the code in the sandbox",
        parameters: z.object({
          wasExecuted: z.boolean().describe("Whether code execution was attempted"),
          compilationSuccess: z.boolean().describe("For compiled languages, did it compile?"),
          runtimeSuccess: z.boolean().describe("Did code run without errors?"),
          analysis: z.string().describe("Analysis of the execution results"),
        }),
        handler: async ({ wasExecuted, compilationSuccess, runtimeSuccess, analysis }, { network }: Tool.Options<OrchestratorState>) => {
          if (network) {
            const executionResults = network.state.data.executionResults;
            network.state.data.currentPhase = "complete";
            const success = wasExecuted && compilationSuccess && runtimeSuccess;
            console.log(`[Validator] Execution ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
            console.log(`[Validator] Analysis: ${analysis}`);
            if (executionResults.stdout) console.log(`[Validator] Output: ${executionResults.stdout.substring(0, 200)}`);
            if (executionResults.stderr) console.log(`[Validator] Errors: ${executionResults.stderr.substring(0, 200)}`);
          }
          return `Validation complete: ${analysis}`;
        },
      }),
    ],
  });

  // Create network with all agents
  const network = createNetwork<OrchestratorState>({
    name: "multi-agent-orchestrator-sync",
    agents: [scannerAgent, fixerAgent, editorAgent, validatorAgent],
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
      } else if (phase === "validating") {
        console.log('[Router] → Executing code before validation...');
        
        // EXECUTE THE CODE BEFORE THE VALIDATOR RUNS
        if (sessionId) {
          try {
            const startTime = Date.now();
            const response = await fetch('http://localhost:3000/api/sandbox/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: sessionId,
                language: language,
                code: network.state.data.finalCode,
                filename: filepath,
              }),
            });

            if (response.ok) {
              const execResult = await response.json();
              const executionTime = Date.now() - startTime;
              
              network.state.data.executionResults = {
                executed: true,
                success: execResult.success && execResult.exitCode === 0,
                stdout: execResult.stdout || '',
                stderr: execResult.stderr || '',
                exitCode: execResult.exitCode,
                executionTime: executionTime,
                errorMessage: execResult.error,
              };
              
              console.log(`[Router] ✅ Code executed in ${executionTime}ms`);
              console.log(`[Router] Exit code: ${execResult.exitCode}`);
              if (execResult.stdout) console.log(`[Router] Output: ${execResult.stdout.substring(0, 200)}`);
              if (execResult.stderr) console.log(`[Router] Stderr: ${execResult.stderr.substring(0, 200)}`);
            } else {
              throw new Error('Execution API failed');
            }
          } catch (error) {
            console.error(`[Router] ❌ Execution failed:`, error);
            network.state.data.executionResults = {
              executed: true,
              success: false,
              stdout: '',
              stderr: error instanceof Error ? error.message : 'Execution failed',
              exitCode: 1,
              executionTime: 0,
              errorMessage: error instanceof Error ? error.message : 'Failed to execute code',
            };
          }
        } else {
          console.log(`[Router] ⚠️ No sessionId provided - skipping execution`);
          network.state.data.executionResults = {
            executed: false,
            success: false,
            stdout: '',
            stderr: 'No sandbox session available',
            exitCode: -1,
            executionTime: 0,
            errorMessage: 'Sandbox session required for code execution',
          };
        }
        
        console.log('[Router] → Validator Agent (analyzing results...)');
        return validatorAgent;
      } else if (phase === "complete") {
        console.log('[Router] → Complete!');
        return;
      }
      
      return scannerAgent;
    },
  });

  console.log(`[Orchestrator] Running multi-agent network...`);
  
  const result = await network.run(
    `The code has already been analyzed by Gemini AI.

Scanner: Acknowledge the ${geminiAnalysis.errors.length} errors found.
Fixer: Acknowledge the ${geminiAnalysis.fixes.length} fixes applied.
Editor: Acknowledge the final code is ready.
Validator: Will analyze execution results after code runs.

Just acknowledge and proceed through the workflow.`,
    { state }
  );

  console.log(`[Orchestrator] ===== RESULTS =====`);
  console.log(`[Orchestrator] Errors found: ${result.state.data.scanResults.errors.length}`);
  console.log(`[Orchestrator] Fixes applied: ${result.state.data.fixResults.changes.length}`);
  console.log(`[Orchestrator] Improvements: ${result.state.data.editorResults.modifications.length}`);
  console.log(`[Orchestrator] Final code length: ${result.state.data.finalCode.length}`);
  console.log(`[Orchestrator] Additional files: ${result.state.data.additionalFiles.length}`);
  console.log(`[Orchestrator] Execution: ${result.state.data.executionResults.executed ? (result.state.data.executionResults.success ? '✅ SUCCESS' : '❌ FAILED') : '⚠️ NOT EXECUTED'}`);
  console.log(`[Orchestrator] ========================`);

  return {
    success: true,
    filepath: result.state.data.filepath,
    originalCode: result.state.data.originalCode,
    finalCode: result.state.data.finalCode,
    additionalFiles: result.state.data.additionalFiles,
    scanResults: result.state.data.scanResults,
    fixResults: result.state.data.fixResults,
    editorResults: result.state.data.editorResults,
    executionResults: result.state.data.executionResults,
  };
}
