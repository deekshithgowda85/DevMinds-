import { inngest } from "../client";
import { FileChange } from "../../gemini-client";

interface FileUpdateEvent {
  data: {
    sessionId: string;
    filepath: string;
    originalCode: string;
    fixedCode: string;
    summary: string;
    additionalFiles?: FileChange[]; // New: Support for multi-file updates
  };
}

export const fileWriterAgentFunction = inngest.createFunction(
  { id: "file-writer-agent" },
  { event: "file-writer/update" },
  async ({ event }: { event: FileUpdateEvent }) => {
    const { sessionId, filepath, fixedCode, summary, additionalFiles } = event.data;
    
    console.log(`[File Writer Agent] Received file update request`);
    console.log(`[File Writer Agent] Session: ${sessionId}`);
    console.log(`[File Writer Agent] File: ${filepath}`);
    console.log(`[File Writer Agent] Summary: ${summary}`);
    if (additionalFiles && additionalFiles.length > 0) {
      console.log(`[File Writer Agent] Additional files to write: ${additionalFiles.length}`, additionalFiles.map(f => f.filepath));
    }

    try {
      // Send update notification to frontend via event
      await inngest.send({
        name: "file-writer/completed",
        data: {
          sessionId,
          filepath,
          fixedCode,
          summary,
          additionalFiles: additionalFiles || [],
          timestamp: Date.now(),
        },
      });

      console.log(`[File Writer Agent] File update event sent for ${filepath}`);
      if (additionalFiles && additionalFiles.length > 0) {
        console.log(`[File Writer Agent] Additional files included: ${additionalFiles.map(f => f.filepath).join(', ')}`);
      }

      return {
        success: true,
        filepath,
        updated: true,
        additionalFilesCount: additionalFiles?.length || 0,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`[File Writer Agent] Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
);
