'use client';

import { useState, useEffect } from 'react';

interface SmartDocsReport {
  generatedAt: string;
  totalSessionsAnalyzed: number;
  sections: {
    recurringMistakes: {
      title: string;
      items: Array<{
        errorType: string;
        count: number;
        trend: 'increasing' | 'decreasing' | 'stable';
      }>;
    };
    conceptWeaknesses: {
      title: string;
      items: Array<{
        concept: string;
        severity: 'high' | 'medium' | 'low';
        sessionsAffected: number;
      }>;
    };
    learningRoadmap: {
      title: string;
      steps: Array<{
        priority: number;
        topic: string;
        reason: string;
      }>;
    };
    debugSpeedMetrics: {
      title: string;
      avgConfidenceOverTime: number[];
      recurringErrorReduction: string;
    };
  };
  markdownReport: string;
}

export default function DocsPage() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<SmartDocsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('devmind-userId');
    if (saved) setUserId(saved);
  }, []);

  async function handleGenerate() {
    const uid = userId.trim() || 'anonymous';
    localStorage.setItem('devmind-userId', uid);
    setUserId(uid);

    setLoading(true);
    setError(null);
    setReport(null);

    try {
      const res = await fetch('/api/devmind/docs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to generate report');
        return;
      }

      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  function copyMarkdown() {
    if (report?.markdownReport) {
      navigator.clipboard.writeText(report.markdownReport);
    }
  }

  const trendIcon = (trend: string) => {
    if (trend === 'decreasing') return '↓';
    if (trend === 'increasing') return '↑';
    return '→';
  };

  const trendColor = (trend: string) => {
    if (trend === 'decreasing') return 'text-green-400';
    if (trend === 'increasing') return 'text-red-400';
    return 'text-yellow-400';
  };

  const severityBadge = (severity: string) => {
    if (severity === 'high')
      return 'bg-red-900/30 text-red-400 border-red-900/50';
    if (severity === 'medium')
      return 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50';
    return 'bg-green-900/30 text-green-400 border-green-900/50';
  };

  const confHistory = report?.sections.debugSpeedMetrics.avgConfidenceOverTime ?? [];
  const maxConf = Math.max(...confHistory, 0.01);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>📊</span>
          <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            SmartDocs Generator
          </span>
        </h1>
        <p className="text-[#888] text-sm mt-1">
          Generate personalized learning reports from your debugging history
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-3 items-end">
        <div className="flex-1 max-w-xs">
          <label className="block text-xs text-[#888] mb-1">User ID</label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="your-name"
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#555] text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2 rounded-lg font-semibold text-white transition-all disabled:opacity-40 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 active:scale-[0.98]"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin">⏳</span> Generating...
            </span>
          ) : (
            '🔄 Generate Report'
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Report */}
      {report && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="flex items-center gap-4 text-sm text-[#888]">
            <span>
              Sessions analyzed:{' '}
              <strong className="text-white">{report.totalSessionsAnalyzed}</strong>
            </span>
            <span>
              Generated:{' '}
              <strong className="text-white">
                {new Date(report.generatedAt).toLocaleString()}
              </strong>
            </span>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Recurring Mistakes */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🔴</span> {report.sections.recurringMistakes.title}
              </h3>
              {report.sections.recurringMistakes.items.length > 0 ? (
                <div className="space-y-2">
                  {report.sections.recurringMistakes.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400">
                          {item.errorType}
                        </span>
                        <span className="text-sm text-[#888]">×{item.count}</span>
                      </div>
                      <span className={`text-sm ${trendColor(item.trend)}`}>
                        {trendIcon(item.trend)} {item.trend}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555]">No recurring mistakes found!</p>
              )}
            </div>

            {/* Concept Weaknesses */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🟡</span> {report.sections.conceptWeaknesses.title}
              </h3>
              {report.sections.conceptWeaknesses.items.length > 0 ? (
                <div className="space-y-2">
                  {report.sections.conceptWeaknesses.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-[#ccc]">{item.concept}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold border ${severityBadge(
                          item.severity
                        )}`}
                      >
                        {item.severity.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555]">No weaknesses identified.</p>
              )}
            </div>

            {/* Learning Roadmap */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-green-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>🟢</span> {report.sections.learningRoadmap.title}
              </h3>
              {report.sections.learningRoadmap.steps.length > 0 ? (
                <div className="space-y-3">
                  {report.sections.learningRoadmap.steps
                    .sort((a, b) => a.priority - b.priority)
                    .map((step, i) => (
                      <div key={i}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm font-bold text-green-400 mt-0.5">
                            {step.priority}.
                          </span>
                          <div>
                            <p className="text-sm font-medium text-white">
                              {step.topic}
                            </p>
                            <p className="text-xs text-[#888]">{step.reason}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-[#555]">Keep debugging to build your roadmap!</p>
              )}
            </div>

            {/* Debug Speed Metrics */}
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <span>📈</span> {report.sections.debugSpeedMetrics.title}
              </h3>
              {/* Mini confidence chart */}
              {confHistory.length > 0 && (
                <div className="mb-3">
                  <span className="text-xs text-[#888]">Confidence Over Time</span>
                  <div className="flex items-end gap-1 mt-2 h-16">
                    {confHistory.slice(-15).map((val, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                        style={{ height: `${(val / maxConf) * 100}%` }}
                        title={`${(val * 100).toFixed(0)}%`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-[#aaa]">
                {report.sections.debugSpeedMetrics.recurringErrorReduction}
              </p>
            </div>
          </div>

          {/* Full Markdown Report */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#888] uppercase tracking-wide flex items-center gap-2">
                <span>📄</span> Full Report
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMarkdown(!showMarkdown)}
                  className="px-3 py-1 rounded text-xs bg-[#222] text-[#aaa] hover:text-white transition-colors"
                >
                  {showMarkdown ? 'Hide' : 'Show'}
                </button>
                <button
                  onClick={copyMarkdown}
                  className="px-3 py-1 rounded text-xs bg-[#222] text-[#aaa] hover:text-white transition-colors"
                >
                  📋 Copy
                </button>
              </div>
            </div>
            {showMarkdown && (
              <pre className="p-4 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a] text-[#ccc] text-sm font-mono overflow-x-auto whitespace-pre-wrap max-h-96 overflow-y-auto">
                {report.markdownReport}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && !error && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-[#888] mb-2">
            No Report Generated Yet
          </h3>
          <p className="text-sm text-[#555] max-w-md mx-auto">
            Enter your user ID and click &quot;Generate Report&quot; to create a personalized
            learning report based on your debugging history.
          </p>
        </div>
      )}
    </div>
  );
}
