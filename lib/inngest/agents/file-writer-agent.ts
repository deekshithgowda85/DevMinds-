import { inngest } from "../client";

interface FileUpdateEvent {
  data: {
    sessionId: string;
    filepath: string;
    originalCode: string;
    fixedCode: string;
    summary: string;
  };
}

export const fileWriterAgentFunction = inngest.createFunction(
  { id: "file-writer-agent" },
  { event: "file-writer/update" },
  async ({ event }: { event: FileUpdateEvent }) => {
    const { sessionId, filepath, fixedCode, summary } = event.data;
    
    console.log(`[File Writer Agent] Received file update request`);
    console.log(`[File Writer Agent] Session: ${sessionId}`);
    console.log(`[File Writer Agent] File: ${filepath}`);
    console.log(`[File Writer Agent] Summary: ${summary}`);

    try {
      // Send update notification to frontend via event
      await inngest.send({
        name: "file-writer/completed",
        data: {
          sessionId,
          filepath,
          fixedCode,
          summary,
          timestamp: Date.now(),
        },
      });

      console.log(`[File Writer Agent] File update event sent for ${filepath}`);

      return {
        success: true,
        filepath,
        updated: true,
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
