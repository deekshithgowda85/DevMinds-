"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface DevMindExplainProps {
  code: string;
  language: string;
  selectedText: string;
}

interface ExplainSection {
  title: string;
  explanation: string;
  difficulty: string;
  lineRange?: string;
  code?: string;
}

export function DevMindExplain({ code, language, selectedText }: DevMindExplainProps) {
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
  const [sections, setSections] = useState<ExplainSection[]>([]);
  const [overview, setOverview] = useState("");
  const [error, setError] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const handleExplain = async () => {
    const codeToExplain = selectedText || code;
    if (!codeToExplain.trim()) {
      setError("No code to explain. Select code or write some first.");
      return;
    }

    setIsLoading(true);
    setError("");
    setSections([]);
    setOverview("");

    try {
      const res = await fetch("/api/devmind/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, language, code: codeToExplain }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Explain failed");
        return;
      }

      // API returns nested: { explanation: { overview, sections, ... } }
      const exp = data.explanation || data;
      setOverview(exp.overview || "");
      // Map API section fields (concept → title, difficulty values)
      const rawSections = exp.sections || data.sections || [];
      setSections(
        rawSections.map((s: Record<string, string>) => ({
          title: s.concept || s.title || `Lines ${s.lineRange || "?"}`,
          explanation: s.explanation || "",
          difficulty: s.difficulty === "easy" ? "beginner" : s.difficulty === "hard" ? "advanced" : s.difficulty || "intermediate",
          lineRange: s.lineRange,
          code: s.code,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const difficultyColor = (d: string) => {
    if (d === "beginner" || d === "easy") return "text-green-400";
    if (d === "intermediate" || d === "medium") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        {/* What will be explained */}
        <div className="text-xs text-muted-foreground">
          {selectedText
            ? `Explaining selected code (${selectedText.split("\n").length} lines)`
            : code.trim()
            ? `Explaining full file (${code.split("\n").length} lines)`
            : "No code available"}
        </div>

        <Button
          onClick={handleExplain}
          disabled={isLoading || (!code.trim() && !selectedText.trim())}
          className="w-full"
          size="sm"
        >
          {isLoading ? "Thinking..." : selectedText ? "\uD83D\uDD0D Explain Selection" : "\uD83D\uDD0D Explain Code"}
        </Button>

        {error && (
          <div className="p-2 rounded border border-red-500/50 bg-red-500/10 text-xs text-red-400">
            {error}
          </div>
        )}

        {overview && (
          <div className="p-2 rounded border bg-muted/30 text-xs">
            <div className="font-semibold mb-1">Overview:</div>
            <div className="text-muted-foreground whitespace-pre-wrap">{overview}</div>
          </div>
        )}

        {sections.length > 0 && (
          <div className="space-y-1">
            {sections.map((sec, i) => (
              <div key={i} className="rounded border bg-muted/20 overflow-hidden">
                <button
                  onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                  className="w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-muted/40"
                >
                  <span className="font-semibold truncate">{sec.title}</span>
                  <span className="flex items-center gap-2">
                    <span className={`text-[10px] ${difficultyColor(sec.difficulty)}`}>
                      {sec.difficulty}
                    </span>
                    <span>{expandedIdx === i ? "\u25B2" : "\u25BC"}</span>
                  </span>
                </button>
                {expandedIdx === i && (
                  <div className="px-3 pb-3 text-xs text-muted-foreground border-t space-y-2">
                    {sec.lineRange && (
                      <div className="text-[10px] text-blue-400 mt-1">Lines: {sec.lineRange}</div>
                    )}
                    {sec.code && (
                      <pre className="p-2 rounded bg-black/30 text-[11px] overflow-x-auto">
                        <code>{sec.code}</code>
                      </pre>
                    )}
                    <div className="whitespace-pre-wrap">{sec.explanation}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
