"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useDevMindAuth } from "@/hooks/use-devmind-auth";

export function DevMindDocs() {
  const { user, guestName } = useDevMindAuth();
  const userId = user?.username || guestName || 'anonymous';

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<{
    generatedAt: string;
    totalSessionsAnalyzed: number;
    sections: {
      recurringMistakes?: { title: string; items: Array<{ errorType: string; count: number; trend: string }> };
      conceptWeaknesses?: { title: string; items: Array<{ concept: string; severity: string; sessionsAffected: number }> };
      learningRoadmap?: { title: string; steps: Array<{ priority: number; topic: string; reason: string }> };
    };
    markdownReport?: string;
  } | null>(null);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await fetch("/api/devmind/docs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to generate docs");
        return;
      }

      setReport(data.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const trendIcon = (t: string) => (t === "decreasing" ? "\u2193" : t === "increasing" ? "\u2191" : "\u2192");
  const sevColor = (s: string) => (s === "high" ? "text-red-400" : s === "medium" ? "text-yellow-400" : "text-green-400");

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        <div className="text-xs text-muted-foreground">
          Generate a personalized learning report from your debug history.
        </div>

        <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="sm">
          {isLoading ? "Generating..." : "\uD83D\uDCDA Generate SmartDocs"}
        </Button>

        {error && (
          <div className="p-2 rounded border border-red-500/50 bg-red-500/10 text-xs text-red-400">{error}</div>
        )}

        {report && (
          <div className="space-y-3">
            <div className="text-[10px] text-muted-foreground">
              {report.totalSessionsAnalyzed} sessions analyzed
            </div>

            {/* Recurring Mistakes */}
            {report.sections.recurringMistakes && report.sections.recurringMistakes.items.length > 0 && (
              <div className="p-2 rounded border bg-muted/30 text-xs space-y-1">
                <div className="font-semibold">{report.sections.recurringMistakes.title}</div>
                {report.sections.recurringMistakes.items.map((m, i) => (
                  <div key={i} className="flex justify-between text-muted-foreground">
                    <span>{m.errorType}</span>
                    <span>
                      {m.count}x {trendIcon(m.trend)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Concept Weaknesses */}
            {report.sections.conceptWeaknesses && report.sections.conceptWeaknesses.items.length > 0 && (
              <div className="p-2 rounded border bg-muted/30 text-xs space-y-1">
                <div className="font-semibold">{report.sections.conceptWeaknesses.title}</div>
                {report.sections.conceptWeaknesses.items.map((w, i) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-muted-foreground">{w.concept}</span>
                    <span className={sevColor(w.severity)}>{w.severity}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Learning Roadmap */}
            {report.sections.learningRoadmap && report.sections.learningRoadmap.steps.length > 0 && (
              <div className="p-2 rounded border bg-muted/30 text-xs space-y-1">
                <div className="font-semibold">{report.sections.learningRoadmap.title}</div>
                {report.sections.learningRoadmap.steps.map((s, i) => (
                  <div key={i} className="text-muted-foreground">
                    <span className="text-blue-400 font-mono mr-1">#{s.priority}</span>
                    <span className="font-medium">{s.topic}</span>
                    <div className="text-[10px] ml-4">{s.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Copy markdown */}
            {report.markdownReport && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7"
                onClick={() => {
                  navigator.clipboard.writeText(report.markdownReport || "");
                }}
              >
                Copy as Markdown
              </Button>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
