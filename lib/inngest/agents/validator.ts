import { ValidationResult, FixResult } from "../client";

export class ValidatorAgent {
  async validate(
    originalCode: string,
    fixedCode: string,
    fixResult: FixResult,
    language: string,
    sessionId: string
  ): Promise<ValidationResult> {
    console.log(`[Validator] Validating fixes in session ${sessionId}`);

    const logicalErrors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];
    let confidence = 100;

    try {
      // Check if fixes introduced new issues
      await this.checkFixIntegrity(fixResult, logicalErrors, warnings);

      // Validate code structure
      await this.validateStructure(
        fixedCode,
        language,
        logicalErrors,
        warnings
      );

      // Check for logical consistency
      await this.checkLogicalConsistency(
        originalCode,
        fixedCode,
        logicalErrors,
        suggestions
      );

      // Calculate confidence based on errors/warnings
      confidence = this.calculateConfidence(logicalErrors, warnings);

      const isValid = logicalErrors.length === 0 && confidence >= 70;

      console.log(
        `[Validator] Validation complete - Valid: ${isValid}, Confidence: ${confidence}%`
      );

      return {
        isValid,
        logicalErrors,
        warnings,
        suggestions,
        confidence,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("[Validator] Error during validation:", error);
      throw error;
    }
  }

  private async checkFixIntegrity(
    fixResult: FixResult,
    logicalErrors: string[],
    warnings: string[]
  ) {
    // Verify that changes are consistent
    const lines = fixResult.fixedCode.split("\n");

    for (const change of fixResult.changes) {
      const lineIndex = change.line - 1;
      if (lineIndex >= lines.length) {
        logicalErrors.push(
          `Change at line ${change.line} exceeds file length`
        );
        continue;
      }

      const actualLine = lines[lineIndex];
      if (actualLine !== change.fixed) {
        warnings.push(
          `Line ${change.line} doesn't match expected fix: "${actualLine}" vs "${change.fixed}"`
        );
      }
    }
  }

  private async validateStructure(
    code: string,
    language: string,
    logicalErrors: string[],
    warnings: string[]
  ) {
    const lines = code.split("\n");

    // Check for balanced brackets
    const brackets = { "{": 0, "[": 0, "(": 0 };
    const closeBrackets = { "}": "{", "]": "[", ")": "(" };

    for (const line of lines) {
      for (const char of line) {
        if (char in brackets) {
          brackets[char as keyof typeof brackets]++;
        } else if (char in closeBrackets) {
          const openChar =
            closeBrackets[char as keyof typeof closeBrackets];
          brackets[openChar as keyof typeof brackets]--;
        }
      }
    }

    Object.entries(brackets).forEach(([bracket, count]) => {
      if (count !== 0) {
        logicalErrors.push(
          `Unbalanced ${bracket} brackets (${Math.abs(count)} ${
            count > 0 ? "unclosed" : "extra closing"
          })`
        );
      }
    });

    // Check for empty blocks
    let inBlock = false;
    let blockStart = 0;

    lines.forEach((line, index) => {
      if (line.includes("{")) {
        inBlock = true;
        blockStart = index;
      }
      if (line.includes("}")) {
        if (inBlock && index - blockStart === 1) {
          warnings.push(`Empty block detected at line ${blockStart + 1}`);
        }
        inBlock = false;
      }
    });
  }

  private async checkLogicalConsistency(
    originalCode: string,
    fixedCode: string,
    logicalErrors: string[],
    suggestions: string[]
  ) {
    // Check if critical functionality was preserved
    const originalFunctions = this.extractFunctions(originalCode);
    const fixedFunctions = this.extractFunctions(fixedCode);

    // Ensure no functions were accidentally removed
    for (const funcName of originalFunctions) {
      if (!fixedFunctions.includes(funcName)) {
        logicalErrors.push(
          `Function '${funcName}' was removed during fixing`
        );
      }
    }

    // Check for unexpected new functions
    for (const funcName of fixedFunctions) {
      if (!originalFunctions.includes(funcName)) {
        suggestions.push(
          `New function '${funcName}' was added - verify this is intentional`
        );
      }
    }

    // Check if variable declarations were preserved
    const originalVars = this.extractVariables(originalCode);
    const fixedVars = this.extractVariables(fixedCode);

    const removedVars = originalVars.filter((v) => !fixedVars.includes(v));
    if (removedVars.length > 0) {
      logicalErrors.push(
        `Variables removed: ${removedVars.join(", ")}`
      );
    }
  }

  private extractFunctions(code: string): string[] {
    const functions: string[] = [];
    const patterns = [
      /function\s+(\w+)/g, // JavaScript
      /def\s+(\w+)/g, // Python
      /\w+\s+(\w+)\s*\([^)]*\)\s*{/g, // C++/Java
    ];

    for (const pattern of patterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) functions.push(match[1]);
      }
    }

    return [...new Set(functions)];
  }

  private extractVariables(code: string): string[] {
    const variables: string[] = [];
    const patterns = [
      /(?:let|const|var)\s+(\w+)/g, // JavaScript
      /(\w+)\s*=/g, // Python/General
    ];

    for (const pattern of patterns) {
      const matches = code.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) variables.push(match[1]);
      }
    }

    return [...new Set(variables)];
  }

  private calculateConfidence(
    logicalErrors: string[],
    warnings: string[]
  ): number {
    let confidence = 100;

    // Deduct confidence for errors and warnings
    confidence -= logicalErrors.length * 20;
    confidence -= warnings.length * 5;

    return Math.max(0, Math.min(100, confidence));
  }
}
