"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DevMindTrace } from "./DevMindTrace";
import { DevMindExplain } from "./DevMindExplain";
import { DevMindDocs } from "./DevMindDocs";
import { DevMindPractice } from "./DevMindPractice";

type DevMindTab = "trace" | "explain" | "docs" | "practice";

interface DevMindPanelProps {
  code: string;
  language: string;
  terminalOutput: string[];
  selectedText: string;
  onClose: () => void;
  onApplyFix?: (fixedCode: string) => void;
  activeTab?: DevMindTab;
  onTabChange?: (tab: DevMindTab) => void;
}

const tabs: { id: DevMindTab; label: string }[] = [
  { id: "trace", label: "Trace" },
  { id: "explain", label: "Explain" },
  { id: "docs", label: "Docs" },
  { id: "practice", label: "Quiz" },
];

export function DevMindPanel({
  code,
  language,
  terminalOutput,
  selectedText,
  onClose,
  onApplyFix,
  activeTab: controlledTab,
  onTabChange,
}: DevMindPanelProps) {
  const [internalTab, setInternalTab] = useState<DevMindTab>("trace");
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: DevMindTab) => {
    if (onTabChange) onTabChange(tab);
    else setInternalTab(tab);
  };

  return (
    <div className="w-80 border-l flex flex-col bg-muted/20 overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b flex items-center justify-between px-3 bg-muted/30">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <span className="text-base">{'\uD83E\uDDE0'}</span>
          DevMind
        </div>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose} title="Close DevMind">
          <span className="text-xs">{'\u00D7'}</span>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex border-b bg-muted/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`flex-1 px-2 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? "border-b-2 border-blue-500 text-blue-400"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "trace" && (
        <DevMindTrace
          code={code}
          language={language}
          terminalOutput={terminalOutput}
          onApplyFix={onApplyFix}
        />
      )}
      {activeTab === "explain" && (
        <DevMindExplain code={code} language={language} selectedText={selectedText} />
      )}
      {activeTab === "docs" && <DevMindDocs />}
      {activeTab === "practice" && <DevMindPractice language={language} />}
    </div>
  );
}

export type { DevMindTab };
