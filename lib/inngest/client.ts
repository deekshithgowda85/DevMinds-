import { Inngest } from "inngest";

// Create an Inngest client
export const inngest = new Inngest({
  id: "multi-agent-debugger",
  name: "Multi-Agent Debugger",
});

// Types for our workflow
export interface ScanResult {
  errors: Array<{
    line: number;
    column: number;
    message: string;
    severity: "error" | "warning" | "info";
    type: string;
  }>;
  suggestions: string[];
  timestamp: number;
}

export interface FixResult {
  originalCode: string;
  fixedCode: string;
  changes: Array<{
    line: number;
    original: string;
    fixed: string;
    reason: string;
  }>;
  timestamp: number;
}

export interface ValidationResult {
  isValid: boolean;
  logicalErrors: string[];
  warnings: string[];
  suggestions: string[];
  confidence: number;
  timestamp: number;
}

export interface WorkflowState {
  code: string;
  language: string;
  filepath: string;
  sessionId: string;
  iteration: number;
  maxIterations: number;
  scanResult?: ScanResult;
  fixResult?: FixResult;
  validationResult?: ValidationResult;
  history: Array<{
    iteration: number;
    scan: ScanResult;
    fix: FixResult;
    validation: ValidationResult;
  }>;
}
