import { inngest, WorkflowState } from "../client";
import { ScannerAgent } from "../agents/scanner";
import { FixerAgent } from "../agents/fixer";
import { ValidatorAgent } from "../agents/validator";

export const debugWorkflow = inngest.createFunction(
  {
    id: "debug-workflow",
    name: "Multi-Agent Debug Workflow",
    retries: 0,
  },
  { event: "debug/start" },
  async ({ event, step }) => {
    const {
      code,
      language,
      filepath,
      sessionId,
      maxIterations = 3,
    } = event.data as {
      code: string;
      language: string;
      filepath: string;
      sessionId: string;
      maxIterations?: number;
    };

    console.log(
      `[Workflow] Starting debug workflow for ${filepath} in session ${sessionId}`
    );

    // Initialize workflow state
    const state: WorkflowState = {
      code,
      language,
      filepath,
      sessionId,
      iteration: 0,
      maxIterations,
      history: [],
    };

    // Initialize agents
    const scanner = new ScannerAgent();
    const fixer = new FixerAgent();
    const validator = new ValidatorAgent();

    let currentCode = code;
    let isValid = false;

    // Iteration loop
    while (state.iteration < maxIterations && !isValid) {
      state.iteration++;
      console.log(
        `[Workflow] Starting iteration ${state.iteration}/${maxIterations}`
      );

      // Step 1: Scan for errors
      const scanResult = await step.run(
        `scan-iteration-${state.iteration}`,
        async () => {
          return await scanner.scan(currentCode, language, sessionId);
        }
      );

      state.scanResult = scanResult;

      // If no errors found, we're done
      if (scanResult.errors.length === 0) {
        console.log("[Workflow] No errors found, validation successful");
        isValid = true;
        state.validationResult = {
          isValid: true,
          logicalErrors: [],
          warnings: [],
          suggestions: scanResult.suggestions,
          confidence: 100,
          timestamp: Date.now(),
        };
        break;
      }

      // Step 2: Apply fixes
      const fixResult = await step.run(
        `fix-iteration-${state.iteration}`,
        async () => {
          return await fixer.fix(
            currentCode,
            scanResult,
            language,
            sessionId
          );
        }
      );

      state.fixResult = fixResult;
      currentCode = fixResult.fixedCode;

      // Step 3: Validate fixes
      const validationResult = await step.run(
        `validate-iteration-${state.iteration}`,
        async () => {
          return await validator.validate(
            code,
            currentCode,
            fixResult,
            language,
            sessionId
          );
        }
      );

      state.validationResult = validationResult;
      isValid = validationResult.isValid;

      // Store iteration history
      state.history.push({
        iteration: state.iteration,
        scan: scanResult,
        fix: fixResult,
        validation: validationResult,
      });

      // Send progress event
      await step.sendEvent(`progress-iteration-${state.iteration}`, {
        name: "debug/progress",
        data: {
          sessionId,
          iteration: state.iteration,
          scanResult,
          fixResult,
          validationResult,
        },
      });

      console.log(
        `[Workflow] Iteration ${state.iteration} complete - Valid: ${isValid}, Confidence: ${validationResult.confidence}%`
      );

      // If validation failed, continue to next iteration
      if (!isValid && state.iteration < maxIterations) {
        console.log(
          `[Workflow] Validation failed, proceeding to iteration ${
            state.iteration + 1
          }`
        );
      }
    }

    // Final result
    const finalResult = {
      success: isValid,
      iterations: state.iteration,
      maxIterations,
      originalCode: code,
      finalCode: currentCode,
      errorList:
        state.scanResult?.errors || [],
      proposedFix: state.fixResult,
      validatorFeedback: state.validationResult,
      history: state.history,
      timestamp: Date.now(),
    };

    console.log(
      `[Workflow] Workflow complete - Success: ${finalResult.success}, Iterations: ${finalResult.iterations}`
    );

    // Send completion event
    await step.sendEvent("workflow-complete", {
      name: "debug/complete",
      data: {
        sessionId,
        result: finalResult,
      },
    });

    return finalResult;
  }
);
