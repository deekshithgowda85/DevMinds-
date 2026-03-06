'use client';

import { useState } from 'react';
import { useDevMindAuth } from '@/hooks/use-devmind-auth';

interface SmartDocsReport {
  generatedAt: string;
  totalSessionsAnalyzed: number;
  sections: {
    recurringMistakes: { title: string; items: Array<{ errorType: string; count: number; trend: 'increasing' | 'decreasing' | 'stable' }> };
    conceptWeaknesses: { title: string; items: Array<{ concept: string; severity: 'high' | 'medium' | 'low'; sessionsAffected: number }> };
    learningRoadmap: { title: string; steps: Array<{ priority: number; topic: string; reason: string }> };
    debugSpeedMetrics: { title: string; avgConfidenceOverTime: number[]; recurringErrorReduction: string };
  };
  markdownReport: string;
}

export default function DocsPage() {
  const { user, guestName } = useDevMindAuth();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SmartDocsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);

  const username = user?.displayName || user?.username || guestName || 'anonymous';

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const res = await fetch('/api/devmind/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: username }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Failed to generate report'); return; }
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const trendColor = (t: string) => t === 'decreasing' ? 'text-green-400' : t === 'increasing' ? 'text-red-400' : 'text-yellow-400';
  const trendIcon = (t: string) => t === 'decreasing' ? '\u2193' : t === 'increasing' ? '\u2191' : '\u2192';
  const severityBadge = (s: string) =>
    s === 'high' ? 'bg-red-900/30 text-red-400 border-red-900/50' :
    s === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
    'bg-green-900/30 text-green-400 border-green-900/50';

  const confHistory = report?.sections.debugSpeedMetrics.avgConfidenceOverTime ?? [];
  const maxConf = Math.max(...confHistory, 0.01);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">SmartDocs</h1>
        <p className="text-[#666] text-sm mt-1">Generate personalized learning reports from your debugging history</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-[#555]">
          Generating report for <span className="text-purple-400 font-mono">{username}</span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2 rounded-lg font-semibold text-white transition-all disabled:opacity-40 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98]"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">{error}</div>
      )}

      {report && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-[#555]">
            <span>Sessions analyzed: <strong className="text-white">{report.totalSessionsAnalyzed}</strong></span>
            <span>Generated: <strong className="text-white">{new Date(report.generatedAt).toLocaleString()}</strong></span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurring Mistakes */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3">{report.sections.recurringMistakes.title}</h3>
              {report.sections.recurringMistakes.items.length > 0 ? (
                <div className="space-y-2">
                  {report.sections.recurringMistakes.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400">{item.errorType}</span>
                        <span className="text-sm text-[#666]">{'\u00D7'}{item.count}</span>
                      </div>
                      <span className={`text-sm ${trendColor(item.trend)}`}>{trendIcon(item.trend)} {item.trend}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#444]">No recurring mistakes found!</p>
              )}
            </div>

            {/* Concept Weaknesses */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-3">{report.sections.conceptWeaknesses.title}</h3>
              {report.sections.conceptWeaknesses.items.length > 0 ? (
                <div className="space-y-2">
                  {report.sections.conceptWeaknesses.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-[#ccc]">{item.concept}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${severityBadge(item.severity)}`}>{item.severity.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#444]">No weaknesses identified.</p>
              )}
            </div>

            {/* Learning Roadmap */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3">{report.sections.learningRoadmap.title}</h3>
              {report.sections.learningRoadmap.steps.length > 0 ? (
                <div className="space-y-3">
                  {report.sections.learningRoadmap.steps.sort((a, b) => a.priority - b.priority).map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm font-bold text-green-400 mt-0.5">{step.priority}.</span>
                      <div>
                        <p className="text-sm font-medium text-white">{step.topic}</p>
                        <p className="text-xs text-[#555]">{step.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#444]">Keep debugging to build your roadmap!</p>
              )}
            </div>

            {/* Speed Metrics */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">{report.sections.debugSpeedMetrics.title}</h3>
              {confHistory.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-[#555]">Confidence Over Time</span>
                  <div className="flex items-end gap-1 mt-2 h-16">
                    {confHistory.slice(-15).map((val, i) => (
                      <div key={i} className="flex-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${(val / maxConf) * 100}%` }} title={`${(val * 100).toFixed(0)}%`} />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-[#888]">{report.sections.debugSpeedMetrics.recurringErrorReduction}</p>
            </div>
          </div>

          {/* Markdown Report */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#666] uppercase tracking-wide">Full Report</h3>
              <div className="flex gap-2">
                <button onClick={() => setShowMarkdown(!showMarkdown)} className="px-3 py-1 rounded text-xs bg-[#222] text-[#888] hover:text-white transition-colors">
                  {showMarkdown ? 'Hide' : 'View'} Markdown
                </button>
                <button onClick={() => navigator.clipboard.writeText(report.markdownReport)} className="px-3 py-1 rounded text-xs bg-[#222] text-[#888] hover:text-white transition-colors">
                  Copy
                </button>
              </div>
            </div>
            {showMarkdown && (
              <pre className="p-4 rounded-lg bg-[#0a0a0a] border border-[#222] text-[#ccc] text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                {report.markdownReport}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
