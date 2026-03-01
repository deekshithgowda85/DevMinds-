'use client';

import { useState, useEffect, useCallback } from 'react';

interface AnalyticsData {
  summary: {
    totalSessions: number;
    uniqueErrorTypes: number;
    uniqueLanguages: number;
    avgConfidence: number;
    currentStreak: number;
    maxStreak: number;
    activeDays: number;
  };
  errorDistribution: { type: string; count: number }[];
  languageDistribution: { language: string; count: number }[];
  confidenceTimeline: { session: number; confidence: number; date: string }[];
  conceptGaps: { concept: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
  recurringMistakes: { errorType: string; count: number }[];
  conceptWeaknesses: { concept: string; count: number }[];
}

const BAR_COLORS = [
  '#a855f7', '#06b6d4', '#ec4899', '#f59e0b',
  '#22c55e', '#3b82f6', '#ef4444', '#14b8a6',
];

export default function AnalyticsPage() {
  const [userId, setUserId] = useState('demo-user');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/devmind/analytics?userId=${encodeURIComponent(userId)}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const maxVal = (arr: { count: number }[]) => Math.max(...arr.map((a) => a.count), 1);

  return (
    <div className="space-y-8 pb-10">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-[#222] p-8" style={{ background: 'linear-gradient(135deg, rgba(88,28,135,0.25), #111 50%, rgba(8,145,178,0.2))' }}>
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">{'\uD83D\uDCC8'}</span>
              <span style={{ background: 'linear-gradient(90deg, #a855f7, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Learning Analytics
              </span>
            </h1>
            <p className="text-[#999] mt-2 text-sm max-w-md">
              Deep insights into your debugging journey. Track progress, spot patterns, and level up faster.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl p-3 border border-[#333]" style={{ background: 'rgba(10,10,10,0.6)' }}>
            <div className="text-xs text-[#666] font-medium">USER</div>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="bg-transparent border-b border-[#444] px-2 py-1 text-sm text-white w-32 focus:border-purple-500 focus:outline-none"
              placeholder="user-id"
            />
            <button
              onClick={fetchAnalytics}
              className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-purple-500/30 animate-ping" />
              <div className="absolute inset-2 rounded-full border-2 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">{'\uD83D\uDCCA'}</div>
            </div>
            <p className="text-[#888] text-sm">Crunching your data...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl p-4 text-sm flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}>
          <span className="text-xl">{'\u26A0\uFE0F'}</span>
          <span>{error}</span>
        </div>
      )}

      {data && !loading && data.summary.totalSessions > 0 && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: 'Total Sessions', value: data.summary.totalSessions, icon: '\uD83D\uDD2C', color: '#a855f7' },
              { label: 'Error Types', value: data.summary.uniqueErrorTypes, icon: '\uD83D\uDC1B', color: '#ef4444' },
              { label: 'Languages', value: data.summary.uniqueLanguages, icon: '\uD83D\uDCBB', color: '#06b6d4' },
              { label: 'Avg Confidence', value: `${data.summary.avgConfidence}%`, icon: '\uD83C\uDFAF', color: '#22c55e' },
              { label: 'Streak', value: `${data.summary.currentStreak}d`, icon: '\uD83D\uDD25', color: '#f59e0b' },
              { label: 'Best Streak', value: `${data.summary.maxStreak}d`, icon: '\u2B50', color: '#eab308' },
              { label: 'Active Days', value: data.summary.activeDays, icon: '\uD83D\uDCC5', color: '#3b82f6' },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200"
                style={{
                  background: `linear-gradient(135deg, ${card.color}15, ${card.color}08)`,
                  border: `1px solid ${card.color}25`,
                }}
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <div className="text-2xl font-bold text-white tracking-tight">{card.value}</div>
                <div className="text-[10px] text-[#777] mt-1 uppercase tracking-wider">{card.label}</div>
              </div>
            ))}
          </div>

          {/* Row 1: Error Distribution + Confidence */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Error Type Distribution */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2 text-white">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>{'\uD83D\uDC1B'}</span>
                  Error Distribution
                </h3>
                <span className="text-xs text-[#555] bg-[#1a1a1a] px-2 py-1 rounded-md">
                  {data.errorDistribution.length} types
                </span>
              </div>
              {data.errorDistribution.length > 0 ? (
                <div className="space-y-4">
                  {data.errorDistribution.slice(0, 6).map((item, i) => {
                    const pct = Math.round((item.count / maxVal(data.errorDistribution)) * 100);
                    const color = BAR_COLORS[i % BAR_COLORS.length];
                    return (
                      <div key={item.type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm text-[#ddd] font-medium truncate max-w-[65%]">{item.type}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#888] font-mono">{item.count}</span>
                            <span className="text-[10px] text-[#555]">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-3 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              minWidth: '12px',
                              background: `linear-gradient(90deg, ${color}, ${color}88)`,
                              transition: 'width 1s ease-out',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyCard text="No errors tracked yet" />
              )}
            </div>

            {/* Confidence Over Time */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2 text-white">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>{'\uD83D\uDCC8'}</span>
                  Confidence Trend
                </h3>
                <span className="text-xs text-[#555] bg-[#1a1a1a] px-2 py-1 rounded-md">
                  Last {Math.min(data.confidenceTimeline.length, 20)} sessions
                </span>
              </div>
              {data.confidenceTimeline.length > 0 ? (
                <div>
                  <div className="flex gap-2">
                    {/* Y-axis */}
                    <div className="flex flex-col justify-between text-right pr-1" style={{ height: '180px' }}>
                      {['100%', '75%', '50%', '25%', '0%'].map((l) => (
                        <span key={l} className="text-[10px] text-[#555] leading-none">{l}</span>
                      ))}
                    </div>
                    {/* Chart */}
                    <div className="flex-1 relative" style={{ height: '180px' }}>
                      {/* Grid lines */}
                      {[0, 25, 50, 75].map((line) => (
                        <div
                          key={line}
                          className="absolute left-0 right-0"
                          style={{ bottom: `${line}%`, borderTop: '1px solid #1a1a1a' }}
                        />
                      ))}
                      {/* Bars */}
                      <div className="flex items-end gap-0.75 relative z-10" style={{ height: '100%' }}>
                        {data.confidenceTimeline.slice(-20).map((point, i) => {
                          const color = point.confidence >= 80 ? '#22c55e' : point.confidence >= 50 ? '#f59e0b' : '#ef4444';
                          return (
                            <div
                              key={i}
                              className="flex-1 group relative flex items-end justify-center"
                              style={{ height: '100%' }}
                            >
                              <div
                                className="w-full rounded-t-sm"
                                style={{
                                  height: `${Math.max(point.confidence, 4)}%`,
                                  background: `linear-gradient(180deg, ${color}, ${color}55)`,
                                  minHeight: '4px',
                                  transition: 'height 0.7s ease-out',
                                }}
                              />
                              <div
                                className="absolute left-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                                style={{
                                  top: '-44px',
                                  transform: 'translateX(-50%)',
                                  background: '#333',
                                  border: '1px solid #444',
                                  borderRadius: '8px',
                                  padding: '4px 10px',
                                  fontSize: '11px',
                                  color: 'white',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>Session #{point.session}</div>
                                <div style={{ color: '#aaa' }}>{point.confidence}%</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-5 mt-4 pt-3" style={{ borderTop: '1px solid #1a1a1a' }}>
                    {[
                      { color: '#22c55e', label: 'High (\u226580%)' },
                      { color: '#f59e0b', label: 'Medium (50-79%)' },
                      { color: '#ef4444', label: 'Low (<50%)' },
                    ].map((l) => (
                      <span key={l.label} className="flex items-center gap-1.5 text-xs text-[#888]">
                        <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: l.color, display: 'inline-block' }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyCard text="No confidence data yet" />
              )}
            </div>
          </div>

          {/* Row 2: Languages + Concept Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Language Distribution */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2 text-white">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>{'\uD83D\uDCBB'}</span>
                  Languages Used
                </h3>
              </div>
              {data.languageDistribution.length > 0 ? (
                <div className="space-y-5">
                  {data.languageDistribution.map((item, i) => {
                    const total = data.languageDistribution.reduce((s, l) => s + l.count, 0);
                    const pct = Math.round((item.count / total) * 100);
                    const color = BAR_COLORS[i % BAR_COLORS.length];
                    return (
                      <div key={item.language}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ background: color, boxShadow: `0 0 8px ${color}44` }}
                            />
                            <span className="text-sm font-medium text-white capitalize">{item.language}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-[#888]">{item.count} sessions</span>
                            <span className="text-sm font-bold text-white">{pct}%</span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${pct}%`,
                              minWidth: '12px',
                              background: `linear-gradient(90deg, ${color}, ${color}66)`,
                              transition: 'width 1s ease-out',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyCard text="No language data yet" />
              )}
            </div>

            {/* Concept Gaps */}
            <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2 text-white">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>{'\uD83E\uDDE0'}</span>
                  Concept Gaps
                </h3>
                <span className="text-xs text-[#555] bg-[#1a1a1a] px-2 py-1 rounded-md">
                  {data.conceptGaps.length} identified
                </span>
              </div>
              {data.conceptGaps.length > 0 ? (
                <div className="space-y-2.5">
                  {data.conceptGaps.slice(0, 8).map((gap, i) => {
                    const severity = gap.count >= 3 ? 'critical' : gap.count >= 2 ? 'warning' : 'info';
                    const cfg = {
                      critical: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.25)', text: '#ef4444', label: 'Critical' },
                      warning: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', text: '#f59e0b', label: 'Warning' },
                      info: { bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.25)', text: '#22c55e', label: 'OK' },
                    }[severity];
                    return (
                      <div
                        key={gap.concept}
                        className="flex items-center justify-between p-3 rounded-xl"
                        style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">{i === 0 ? '\uD83D\uDD34' : i === 1 ? '\uD83D\uDFE0' : i < 4 ? '\uD83D\uDFE1' : '\uD83D\uDFE2'}</span>
                          <span className="text-sm text-[#ddd] font-medium">{gap.concept}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                            style={{ color: cfg.text, background: `${cfg.text}15`, border: `1px solid ${cfg.text}30` }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-xs text-[#888] font-mono">{gap.count}x</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyCard text="No concept gaps identified yet" />
              )}
            </div>
          </div>

          {/* Full-width: Activity Heatmap */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold flex items-center gap-2 text-white">
                <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)' }}>{'\uD83D\uDCC5'}</span>
                Debug Activity
              </h3>
              <span className="text-xs text-[#555] bg-[#1a1a1a] px-2 py-1 rounded-md">
                {data.dailyActivity.reduce((s, d) => s + d.count, 0)} total sessions
              </span>
            </div>
            {data.dailyActivity.length > 0 ? (
              <div>
                <div className="flex flex-wrap gap-2">
                  {data.dailyActivity.map((day) => {
                    const opacity = day.count >= 5 ? 1 : day.count >= 3 ? 0.75 : day.count >= 2 ? 0.5 : 0.25;
                    return (
                      <div
                        key={day.date}
                        className="group relative rounded-lg flex items-center justify-center cursor-default"
                        style={{
                          width: '42px',
                          height: '42px',
                          background: `rgba(168, 85, 247, ${opacity})`,
                          border: `1px solid rgba(168, 85, 247, ${opacity * 0.5})`,
                          transition: 'transform 0.15s',
                        }}
                        onMouseEnter={(e) => { (e.target as HTMLElement).style.transform = 'scale(1.15)'; }}
                        onMouseLeave={(e) => { (e.target as HTMLElement).style.transform = 'scale(1)'; }}
                      >
                        <span className="text-xs font-bold text-white/90">{day.count}</span>
                        <div
                          className="absolute opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20"
                          style={{
                            top: '-38px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            background: '#333',
                            border: '1px solid #444',
                            borderRadius: '8px',
                            padding: '4px 10px',
                            fontSize: '11px',
                            color: 'white',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                          }}
                        >
                          {day.date} — {day.count} session{day.count > 1 ? 's' : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-xs text-[#555]">Less</span>
                  {[0.25, 0.5, 0.75, 1].map((op) => (
                    <span
                      key={op}
                      style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '4px',
                        background: `rgba(168, 85, 247, ${op})`,
                        display: 'inline-block',
                      }}
                    />
                  ))}
                  <span className="text-xs text-[#555]">More</span>
                </div>
              </div>
            ) : (
              <EmptyCard text="No activity yet — start debugging!" />
            )}
          </div>

          {/* Recurring + Weaknesses */}
          {(data.recurringMistakes.length > 0 || data.conceptWeaknesses.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {data.recurringMistakes.length > 0 && (
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
                  <h3 className="font-semibold flex items-center gap-2 text-white mb-5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239,68,68,0.1)' }}>{'\uD83D\uDD04'}</span>
                    Recurring Mistakes
                  </h3>
                  <div className="space-y-3">
                    {data.recurringMistakes.map((m, i) => (
                      <div
                        key={m.errorType}
                        className="flex items-center gap-3 p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#151515] transition-colors"
                        style={{ border: '1px solid #1a1a1a' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: BAR_COLORS[i % BAR_COLORS.length] + '33' }}
                        >
                          {i + 1}
                        </div>
                        <span className="text-sm text-[#ccc] flex-1">{m.errorType}</span>
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0"
                          style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          {m.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {data.conceptWeaknesses.length > 0 && (
                <div className="bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#333] transition-colors">
                  <h3 className="font-semibold flex items-center gap-2 text-white mb-5">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.1)' }}>{'\u26A0\uFE0F'}</span>
                    Concept Weaknesses
                  </h3>
                  <div className="space-y-3">
                    {data.conceptWeaknesses.map((w, i) => {
                      const color = BAR_COLORS[i % BAR_COLORS.length];
                      const barPct = Math.round((w.count / maxVal(data.conceptWeaknesses)) * 100);
                      return (
                        <div
                          key={w.concept}
                          className="p-3 rounded-xl bg-[#0a0a0a] hover:bg-[#151515] transition-colors"
                          style={{ border: '1px solid #1a1a1a' }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-[#ddd] font-medium">{w.concept}</span>
                            <span
                              className="text-xs font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}
                            >
                              {w.count}x
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1a1a1a' }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${barPct}%`,
                                minWidth: '12px',
                                background: `linear-gradient(90deg, ${color}, ${color}66)`,
                                transition: 'width 1s ease-out',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {data && data.summary.totalSessions === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full animate-pulse" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(6,182,212,0.2))' }} />
            <div className="absolute inset-0 flex items-center justify-center text-5xl">{'\uD83D\uDCCA'}</div>
          </div>
          <h2 className="text-2xl font-bold mb-3">No Data Yet</h2>
          <p className="text-[#888] mb-8 text-center max-w-sm">
            Start using the CodeTrace Debugger to build your learning profile.
            Analytics will come alive as you debug more code.
          </p>
          <a
            href="/devmind/debug"
            className="text-white font-semibold px-8 py-3 rounded-xl text-sm transition-all"
            style={{ background: 'linear-gradient(90deg, #9333ea, #0891b2)' }}
          >
            {'\uD83D\uDD0D'} Start Debugging
          </a>
        </div>
      )}
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="text-3xl mb-2 opacity-30">{'\uD83D\uDCED'}</div>
      <p className="text-[#555] text-sm">{text}</p>
    </div>
  );
}
