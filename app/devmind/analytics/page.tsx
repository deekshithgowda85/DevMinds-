'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface SessionStats {
  date: string;
  conceptsLearned: number;
  avgConfidence: number;
  language: string;
  topics: string[];
}

interface AnalyticsData {
  totalSessions: number;
  totalConcepts: number;
  avgConfidence: number;
  strongLanguages: string[];
  recentSessions: SessionStats[];
  conceptsByLanguage: Record<string, number>;
  confidenceOverTime: Array<{ date: string; confidence: number }>;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const username = user?.isAnonymous
    ? 'guest'
    : user?.displayName || user?.email?.split('@')[0] || 'anonymous';

  const fetchAnalytics = async (uname: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/devmind/analytics?userId=${encodeURIComponent(uname)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setAnalytics(data.analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) fetchAnalytics(username);
  }, [authLoading, user, username]);

  const summary = [
    { label: 'Total Sessions', value: analytics?.totalSessions ?? '-' },
    { label: 'Concepts Learned', value: analytics?.totalConcepts ?? '-' },
    { label: 'Avg Confidence', value: analytics ? `${(analytics.avgConfidence * 100).toFixed(0)}%` : '-' },
    { label: 'Languages', value: analytics?.strongLanguages?.length ?? '-' },
  ];

  const maxBar = analytics
    ? Math.max(...Object.values(analytics.conceptsByLanguage), 1)
    : 1;

  const confData = analytics?.confidenceOverTime ?? [];
  const maxConf = Math.max(...confData.map((d) => d.confidence), 1);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-[#666] text-sm mt-1">
            Learning insights for <span className="text-purple-400 font-mono">{username}</span>
          </p>
        </div>
        {user && (
          <button
            onClick={() => fetchAnalytics(username)}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#aaa] bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] hover:text-white transition-all disabled:opacity-40"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </div>

      {!user && !authLoading && (
        <div className="p-6 rounded-xl bg-[#111] border border-[#222] text-center text-[#666]">
          Sign in to view your analytics.
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">{error}</div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20 text-[#555]">Loading analytics...</div>
      )}

      {analytics && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summary.map((item) => (
              <div key={item.label} className="bg-[#111] rounded-xl border border-[#222] p-5 text-center">
                <p className="text-2xl font-bold text-white">{String(item.value)}</p>
                <p className="text-xs text-[#555] mt-1">{item.label}</p>
              </div>
            ))}
          </div>

          {/* Concepts by Language Bar Chart */}
          {Object.keys(analytics.conceptsByLanguage).length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-6">
              <h2 className="text-sm font-semibold text-[#999] mb-4 uppercase tracking-wider">Concepts by Language</h2>
              <div className="space-y-3">
                {Object.entries(analytics.conceptsByLanguage).sort((a, b) => b[1] - a[1]).map(([lang, count]) => (
                  <div key={lang} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-[#888] text-right shrink-0">{lang}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-purple-600 to-pink-600 h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxBar) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-xs text-[#666]">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Confidence Over Time */}
          {confData.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-6">
              <h2 className="text-sm font-semibold text-[#999] mb-4 uppercase tracking-wider">Confidence Over Time</h2>
              <div className="flex items-end gap-1 h-32">
                {confData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-purple-500/70 min-h-[4px] transition-all"
                      style={{ height: `${(d.confidence / maxConf) * 100}%` }}
                      title={`${d.date}: ${(d.confidence * 100).toFixed(0)}%`}
                    />
                    {confData.length <= 10 && (
                      <span className="text-[9px] text-[#555] rotate-45 origin-left">{d.date.slice(5)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Sessions */}
          {analytics.recentSessions.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-6">
              <h2 className="text-sm font-semibold text-[#999] mb-4 uppercase tracking-wider">Recent Sessions</h2>
              <div className="divide-y divide-[#1e1e1e]">
                {analytics.recentSessions.map((s, i) => (
                  <div key={i} className="py-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-[#555] text-xs w-24 shrink-0">{s.date}</span>
                    <span className="text-white font-mono">{s.language}</span>
                    <span className="text-[#888]">{s.conceptsLearned} concepts</span>
                    <span className="text-purple-400">{(s.avgConfidence * 100).toFixed(0)}% confidence</span>
                    {s.topics.length > 0 && (
                      <span className="text-[#555] truncate max-w-xs">{s.topics.slice(0, 3).join(', ')}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Strong Languages */}
          {analytics.strongLanguages.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-6">
              <h2 className="text-sm font-semibold text-[#999] mb-3 uppercase tracking-wider">Strong Languages</h2>
              <div className="flex flex-wrap gap-2">
                {analytics.strongLanguages.map((lang) => (
                  <span key={lang} className="px-3 py-1.5 rounded-full text-sm bg-purple-900/30 text-purple-300 border border-purple-900/50">
                    {lang}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
