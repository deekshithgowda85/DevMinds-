import { inngest } from "../client";
import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";
import { FileChange, analyzeCodeWithGemini } from "../../gemini-client";

interface OrchestratorState {
  sessionId: string;
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

export const orchestratorAgentFunction = inngest.createFunction(
  { id: "orchestrator-agent" },
  { event: "code/analyze" },
  async ({ event }) => {
    
    console.log(`[Orchestrator] Starting multi-agent analysis`);
    console.log(`[Orchestrator] Language: ${event.data.language}, File: ${event.data.filepath}`);
    
    // 🚀 OPTIMIZATION: Call Gemini ONCE here, not in each agent
    console.log(`[Orchestrator] 🤖 Calling Gemini AI once for comprehensive analysis...`);
    const geminiAnalysis = await analyzeCodeWithGemini(event.data.code, event.data.language);
    
    if (!geminiAnalysis) {
      console.error('[Orchestrator] ❌ Gemini analysis failed');
      throw new Error('Failed to analyze code with Gemini AI. Please check your API key.');
    }
    
    console.log(`[Orchestrator] ✅ Gemini analysis complete:`);
    console.log(`  - Errors: ${geminiAnalysis.errors.length}`);
    console.log(`  - Fixes: ${geminiAnalysis.fixes.length}`);
    console.log(`  - Additional files: ${geminiAnalysis.additionalFiles?.length || 0}`);
    
    const state = createState<OrchestratorState>({
      sessionId: event.data.sessionId || "unknown",
      filepath: event.data.filepath || "untitled",
      language: event.data.language,
      originalCode: event.data.code,
      scannedCode: event.data.code,
      fixedCode: event.data.code,
      finalCode: event.data.code,
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

    const scannerAgent = createAgent<OrchestratorState>({
      name: "scanner",
      description: "Reports scan results from Gemini",
      system: "You are a reporting agent. Code already analyzed by Gemini. Just acknowledge.",
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
      }),
      tools: [
        createTool({
          name: "scanCode",
          description: "Report Gemini scan results",
          parameters: z.object({
            acknowledged: z.boolean().describe("Acknowledge results"),
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
              console.log(`[Scanner Agent] Reported ${geminiAnalysis.errors.length} errors from Gemini`);
            }
            return `Reported ${geminiAnalysis.errors.length} errors`;
          },
        }),
      ],
    });

    const fixerAgent = createAgent<OrchestratorState>({
      name: "fixer",
      description: "Reports fixes from Gemini",
      system: "You are a reporting agent. Code already fixed by Gemini. Just acknowledge.",
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
              console.log(`[Fixer Agent] Reported ${geminiAnalysis.fixes.length} fixes from Gemini`);
            }
            return `Reported ${geminiAnalysis.fixes.length} fixes`;
          },
        }),
      ],
    });

    const editorAgent = createAgent<OrchestratorState>({
      name: "editor",
      description: "Reports final code from Gemini",
      system: "You are a reporting agent. Code already finalized by Gemini. Just acknowledge.",
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
              console.log(`[Editor Agent] Reported final code from Gemini (${geminiAnalysis.fixedCode.length} chars, ${geminiAnalysis.additionalFiles?.length || 0} files)`);
            }
            return `Final code ready: ${geminiAnalysis.fixedCode.length} chars, ${geminiAnalysis.additionalFiles?.length || 0} files`;
          },
        }),
      ],
    });

    const validatorAgent = createAgent<OrchestratorState>({
      name: "validator",
      description: "Reviews execution results and validates code ran successfully",
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

Your job is to analyze these results and provide a summary:
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
          description: "Report your analysis of the execution results",
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
              console.log(`[Validator Agent] Execution ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
              console.log(`[Validator Agent] Analysis: ${analysis}`);
              if (executionResults.stdout) console.log(`[Validator Agent] Output: ${executionResults.stdout.substring(0, 200)}`);
              if (executionResults.stderr) console.log(`[Validator Agent] Errors: ${executionResults.stderr.substring(0, 200)}`);
            }
            return `Validation complete: ${analysis}`;
          },
        }),
      ],
    });

    const network = createNetwork<OrchestratorState>({
      name: "multi-agent-orchestrator",
      agents: [scannerAgent, fixerAgent, editorAgent, validatorAgent],
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
        } else if (phase === "validating") {
          console.log('[Orchestrator Router] -> Executing code before validation...');
          
          // Execute the code before validator runs
          const sessionId = network.state.data.sessionId;
          const language = network.state.data.language;
          const finalCode = network.state.data.finalCode;
          const filepath = network.state.data.filepath;
          
          try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sandbox/execute`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId,
                language,
                code: finalCode,
                filename: filepath,
              }),
            });
            
            const result = await response.json();
            
            if (result.success) {
              network.state.data.executionResults = {
                executed: true,
                success: result.exitCode === 0,
                stdout: result.stdout || '',
                stderr: result.stderr || '',
                exitCode: result.exitCode,
                executionTime: result.executionTime,
                errorMessage: result.error,
              };
              console.log(`[Orchestrator Router] ✅ Code executed successfully`);
            } else {
              network.state.data.executionResults = {
                executed: true,
                success: false,
                stdout: result.stdout || '',
                stderr: result.stderr || result.error || '',
                exitCode: result.exitCode || -1,
                executionTime: 0,
                errorMessage: result.error,
              };
              console.log(`[Orchestrator Router] ❌ Code execution failed: ${result.error}`);
            }
          } catch (error) {
            console.error('[Orchestrator Router] Error executing code:', error);
            network.state.data.executionResults = {
              executed: true,
              success: false,
              stdout: '',
              stderr: error instanceof Error ? error.message : 'Unknown error',
              exitCode: -1,
              executionTime: 0,
              errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
          }
          
          console.log('[Orchestrator Router] -> Validator Agent (analyzing results...)');
          return validatorAgent;
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
      `The code has already been analyzed by Gemini AI.

Scanner: Acknowledge the ${geminiAnalysis.errors.length} errors found.
Fixer: Acknowledge the ${geminiAnalysis.fixes.length} fixes applied.
Editor: Acknowledge the final code is ready.
Validator: Will analyze execution results after code runs.

Just acknowledge and proceed through the workflow.`,
      { state }
    );

    console.log(`[Orchestrator] ===== MULTI-AGENT COMPLETION =====`);
    console.log(`[Orchestrator] Errors found: ${result.state.data.scanResults.errors.length}`);
    console.log(`[Orchestrator] Fixes applied: ${result.state.data.fixResults.changes.length}`);
    console.log(`[Orchestrator] Improvements: ${result.state.data.editorResults.modifications.length}`);
    console.log(`[Orchestrator] Final code length: ${result.state.data.finalCode.length}`);
    console.log(`[Orchestrator] Additional files: ${result.state.data.additionalFiles.length}`);
    console.log(`[Orchestrator] Execution: ${result.state.data.executionResults.executed ? (result.state.data.executionResults.success ? '✅ SUCCESS' : '❌ FAILED') : '⚠️ NOT EXECUTED'}`);
    console.log(`[Orchestrator] ================================`);

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
);
