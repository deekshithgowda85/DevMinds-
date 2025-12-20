import { inngest } from "../client";
import { createAgent, gemini, createTool, createNetwork, type Tool, createState } from "@inngest/agent-kit";
import { z } from "zod";

interface CodeEditorState {
  filepath: string;
  originalCode: string;
  fixedCode: string;
  errors: Array<{
    line: number;
    message: string;
    severity: string;
    type: string;
  }>;
  modifications: Array<{
    type: "fix" | "refactor" | "optimize";
    description: string;
    lineStart: number;
    lineEnd: number;
  }>;
  language: string;
  summary: string;
}

const CODE_EDITOR_PROMPT = `You are an Expert Code Fixer.  
Input: any code with errors.  
Output: ONLY the fully corrected, complete, runnable code.

Rules:
C++ → include headers, std:: prefix, int main(){... return 0;} , correct << , semicolons.  
Python → PEP8, imports, type hints.  
JS/TS → const/let, arrow funcs, ===, semicolons.  
Java → class + public static void main, imports.

Always: fix all errors, improve style, add missing parts, no explanation, final code must run with zero errors.
`;

export const codeEditorAgentFunction = inngest.createFunction(
  { id: "code-editor-agent" },
  { event: "code-editor/analyze" },
  async ({ event }) => {
    
    console.log(`[Code Editor Agent] Starting for ${event.data.language} file: ${event.data.filepath}`);
    console.log(`[Code Editor Agent] Session ID: ${event.data.sessionId}`);
    
    const state = createState<CodeEditorState>({
      filepath: event.data.filepath || "untitled",
      originalCode: event.data.code,
      fixedCode: event.data.code,
      errors: [],
      modifications: [],
      language: event.data.language,
      summary: "",
    });

    const codeEditorAgent = createAgent<CodeEditorState>({
      name: "code-editor",
      description: `Expert ${event.data.language} code editor and debugger`,
      system: CODE_EDITOR_PROMPT,
      model: gemini({
        model: "gemini-2.5-flash",
        apiKey: process.env.GEMINI_API_KEY!,
      }),
      tools: [
        createTool({
          name: "analyzeCode",
          description: "Deeply analyze the code to find ALL errors, bugs, missing components, and improvement opportunities",
          parameters: z.object({
            errors: z.array(z.object({
              line: z.number(),
              message: z.string(),
              severity: z.enum(["error", "warning", "info"]),
              type: z.string(),
            })),
          }),
          handler: async ({ errors }, { network }: Tool.Options<CodeEditorState>) => {
            if (network) {
              network.state.data.errors = errors;
              console.log(`[Code Editor Agent] Found ${errors.length} issues`);
            }
            return `Analysis complete: ${errors.length} issues identified`;
          },
        }),

        createTool({
          name: "planModifications",
          description: "Plan what modifications need to be made to fix all issues",
          parameters: z.object({
            modifications: z.array(z.object({
              type: z.enum(["fix", "refactor", "optimize"]),
              description: z.string(),
              lineStart: z.number(),
              lineEnd: z.number(),
            })),
          }),
          handler: async ({ modifications }, { network }: Tool.Options<CodeEditorState>) => {
            if (network) {
              network.state.data.modifications = modifications;
              console.log(`[Code Editor Agent] Planned ${modifications.length} modifications`);
            }
            return `Planned ${modifications.length} modifications`;
          },
        }),

        createTool({
          name: "generateFixedCode",
          description: "Generate the COMPLETE fixed code with ALL modifications applied. Must be compilable/runnable.",
          parameters: z.object({
            fixedCode: z.string().describe("Complete working code with all fixes applied"),
            summary: z.string().describe("Summary of all changes made"),
          }),
          handler: async ({ fixedCode, summary }, { network }: Tool.Options<CodeEditorState>) => {
            if (network) {
              network.state.data.fixedCode = fixedCode;
              network.state.data.summary = summary;
              console.log(`[Code Editor Agent] Generated fixed code (${fixedCode.length} chars)`);
              console.log(`[Code Editor Agent] Summary: ${summary}`);
            }
            return "Fixed code generated successfully";
          },
        }),

        createTool({
          name: "saveResult",
          description: "Save the final result and complete the editing process. This will trigger a file update event.",
          parameters: z.object({
            confirmed: z.boolean().describe("Confirm that all fixes are applied and code is ready"),
          }),
          handler: async ({ confirmed }, { network }: Tool.Options<CodeEditorState>) => {
            if (confirmed && network) {
              console.log(`[Code Editor Agent] Result confirmed - triggering file update`);
            }
            return "Process completed!";
          },
        }),
      ],
    });

    const network = createNetwork<CodeEditorState>({
      name: "code-editor-network",
      agents: [codeEditorAgent],
      maxIter: 20,
      defaultState: state,
      router: async ({ network }) => {
        console.log(`[Router] Summary exists: ${!!network.state.data.summary}`);
        console.log(`[Router] Modifications: ${network.state.data.modifications.length}`);
        console.log(`[Router] Fixed code different: ${network.state.data.fixedCode !== network.state.data.originalCode}`);
        
        // Stop if we have fixed code and a summary
        if (network.state.data.summary && network.state.data.fixedCode !== network.state.data.originalCode) {
          console.log('[Router] Work complete - stopping network');
          return;
        }
        
        // Continue with code editor agent
        return codeEditorAgent;
      },
    });

    const result = await network.run(
      `Fix this ${event.data.language} code from file "${event.data.filepath}":\n\n${event.data.code}\n\nAnalyze thoroughly, plan modifications, and generate complete working code.`,
      { state }
    );

    console.log(`[Code Editor Agent] Completed with ${result.state.data.modifications.length} modifications`);

    // Trigger file update event if we have fixed code
    const hasChanges = result.state.data.fixedCode !== result.state.data.originalCode;
    const hasSummary = !!result.state.data.summary;
    
    console.log(`[Code Editor Agent] Has changes: ${hasChanges}, Has summary: ${hasSummary}`);
    
    if (hasChanges && hasSummary && event.data.sessionId) {
      console.log(`[Code Editor Agent] ✅ Triggering file-writer agent for session ${event.data.sessionId}`);
      
      try {
        await inngest.send({
          name: "file-writer/update",
          data: {
            sessionId: event.data.sessionId,
            filepath: event.data.filepath,
            originalCode: result.state.data.originalCode,
            fixedCode: result.state.data.fixedCode,
            summary: result.state.data.summary,
          },
        });
        console.log(`[Code Editor Agent] ✅ File-writer event sent successfully`);
      } catch (error) {
        console.error(`[Code Editor Agent] ❌ Failed to send file-writer event:`, error);
      }
    } else {
      console.log(`[Code Editor Agent] ⚠️ Skipping file-writer (no changes or incomplete)`);
    }

    return {
      success: true,
      filepath: result.state.data.filepath,
      originalCode: result.state.data.originalCode,
      fixedCode: result.state.data.fixedCode,
      errors: result.state.data.errors,
      modifications: result.state.data.modifications,
      summary: result.state.data.summary,
    };
  }
);
