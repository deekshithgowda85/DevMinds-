"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface DevMindTraceProps {
  code: string;
  language: string;
  terminalOutput: string[];
  onApplyFix?: (fixedCode: string) => void;
}

export function DevMindTrace({ code, language, terminalOutput, onApplyFix }: DevMindTraceProps) {
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devmind-userId");
      if (stored) return stored;
      const id = "user-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("devmind-userId", id);
      return id;
    }
    return "user-default";
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    errorType: string;
    detectedConceptGap: string;
    explanationSummary: string;
    fix: string;
    confidenceLevel: number;
    isRecurring: boolean;
    learningTip: string;
    similarPastErrors: number;
  } | null>(null);
  const [error, setError] = useState("");

  // Extract errors from terminal output
  const extractErrors = (): string => {
    const errorKeywords = ["Error", "Exception", "Traceback", "failed", "FAILED", "TypeError", "SyntaxError", "ReferenceError", "undefined"];
    const errorLines = terminalOutput.filter((line) =>
      errorKeywords.some((kw) => line.includes(kw))
    );
    return errorLines.length > 0 ? errorLines.join("\n") : terminalOutput.slice(-5).join("\n");
  };

  const handleDebug = async () => {
    if (!code.trim()) {
      setError("No code in editor. Write some code first.");
      return;
    }

    const errorMessage = extractErrors();
    if (!errorMessage.trim()) {
      setError("No errors detected in terminal output. Run your code first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/devmind/debug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, language, code, errorMessage }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Debug failed");
        return;
      }

      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const hasErrors = terminalOutput.some((l) =>
    ["Error", "Exception", "Traceback", "failed", "FAILED"].some((kw) => l.includes(kw))
  );

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        {/* Status */}
        <div className="flex items-center gap-2 text-xs">
          <span className={`w-2 h-2 rounded-full ${hasErrors ? "bg-red-500" : "bg-green-500"}`} />
          <span className="text-muted-foreground">
            {hasErrors ? "Errors detected in terminal" : "No errors detected"}
          </span>
        </div>

        {/* Debug button */}
        <Button
          onClick={handleDebug}
          disabled={isLoading || !code.trim()}
          className="w-full"
          size="sm"
          variant={hasErrors ? "destructive" : "default"}
        >
          {isLoading ? "Analyzing..." : "\uD83D\uDD0D CodeTrace Debug"}
        </Button>

        {/* Error message */}
        {error && (
          <div className="p-2 rounded border border-red-500/50 bg-red-500/10 text-xs text-red-400">
            {error}
          </div>
        )}

        {/* Results */}
        {result && (() => {
          const confPct = result.confidenceLevel <= 1 ? Math.round(result.confidenceLevel * 100) : Math.round(result.confidenceLevel);
          return (
          <div className="space-y-2">
            {/* Confidence bar */}
            <div className="p-2 rounded border bg-muted/30">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold">Confidence</span>
                <span>{confPct}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${confPct}%`,
                    backgroundColor:
                      confPct >= 80 ? "#22c55e" : confPct >= 50 ? "#eab308" : "#ef4444",
                  }}
                />
              </div>
            </div>

            {/* Error type */}
            <div className="p-2 rounded border bg-muted/30 text-xs">
              <span className="font-semibold">Error: </span>
              <span className="text-red-400">{result.errorType}</span>
              {result.isRecurring && (
                <span className="ml-1 text-yellow-400">(recurring)</span>
              )}
            </div>

            {/* Concept gap */}
            <div className="p-2 rounded border bg-muted/30 text-xs">
              <span className="font-semibold">Concept Gap: </span>
              <span className="text-blue-400">{result.detectedConceptGap}</span>
            </div>

            {/* Explanation */}
            <div className="p-2 rounded border bg-muted/30 text-xs">
              <div className="font-semibold mb-1">Explanation:</div>
              <div className="text-muted-foreground whitespace-pre-wrap">{result.explanationSummary}</div>
            </div>

            {/* Fix */}
            <div className="p-2 rounded border bg-green-500/10 border-green-500/30 text-xs">
              <div className="font-semibold mb-1 text-green-400">Fix:</div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-green-300">{result.fix}</pre>
              {onApplyFix && result.fix && (
                <Button
                  onClick={() => onApplyFix(result.fix)}
                  size="sm"
                  variant="outline"
                  className="mt-2 w-full text-xs h-7"
                >
                  Apply Fix to Editor
                </Button>
              )}
            </div>

            {/* Learning tip */}
            <div className="p-2 rounded border bg-blue-500/10 border-blue-500/30 text-xs">
              <div className="font-semibold mb-1 text-blue-400">{'\uD83D\uDCA1'} Learning Tip:</div>
              <div className="text-muted-foreground">{result.learningTip}</div>
            </div>

            {/* Stats */}
            <div className="flex gap-2 text-[10px] text-muted-foreground">
              <span>Past similar: {result.similarPastErrors}</span>
            </div>
          </div>
          );
        })()}
      </div>
    </ScrollArea>
  );
}
