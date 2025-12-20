import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { debugWorkflow } from "@/lib/inngest/functions/debug-workflow";
import { debugAgentFunction } from "@/lib/inngest/agents/debug-agent";
import { codeEditorAgentFunction } from "@/lib/inngest/agents/code-editor-agent";
import { fileWriterAgentFunction } from "@/lib/inngest/agents/file-writer-agent";
import { orchestratorAgentFunction } from "@/lib/inngest/agents/orchestrator-agent";

// Create the Inngest API route handler with AI agents
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    debugWorkflow,
    debugAgentFunction,
    codeEditorAgentFunction,
    fileWriterAgentFunction,
    orchestratorAgentFunction,
  ],
});
