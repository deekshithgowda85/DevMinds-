'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface MemoryStats {
  totalSessions: number;
  recentSessions: Array<{
    id: string;
    errorType: string;
    language: string;
    conceptGap: string | null;
    confidenceLevel: number;
    createdAt: string;
  }>;
  learningMetrics: {
    recurringMistakes: Array<{ errorType: string; count: number }>;
    conceptWeaknesses: Array<{ concept: string; count: number }>;
    improvementMetrics: {
      avgConfidence: number;
      uniqueErrorTypes: number;
      confidenceHistory: number[];
    };
  } | null;
}

export default function DevMindDashboard() {
  const [userId, setUserId] = useState('');
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('devmind-userId');
    if (saved) {
      setUserId(saved);
      loadStats(saved);
    }
  }, []);

  async function loadStats(id: string) {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/devmind/memory?userId=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success) {
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  }

  function handleSetUser() {
    if (userId.trim()) {
      localStorage.setItem('devmind-userId', userId.trim());
      loadStats(userId.trim());
    }
  }

  const metrics = stats?.learningMetrics;
  const avgConf = metrics?.improvementMetrics?.avgConfidence ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h1 className="text-4xl font-bold mb-2">
          <span className="bg-linear-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            DevMind
          </span>
        </h1>
        <p className="text-[#888] text-lg">
          Memory-Driven AI Debugging &amp; Learning System
        </p>
      </div>

      {/* User ID Input */}
      <div className="max-w-md mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUser()}
            placeholder="Enter your user ID..."
            className="flex-1 px-4 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white placeholder-[#555] focus:outline-none focus:border-purple-500 transition-colors"
          />
          <button
            onClick={handleSetUser}
            className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            Load
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center text-[#888]">
          <span className="animate-pulse">Loading your data...</span>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total Sessions */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-6">
            <div className="text-3xl font-bold text-purple-400">
              {stats.totalSessions}
            </div>
            <div className="text-sm text-[#888] mt-1">Debug Sessions</div>
          </div>

          {/* Avg Confidence */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-6">
            <div className="text-3xl font-bold text-cyan-400">
              {(avgConf * 100).toFixed(0)}%
            </div>
            <div className="text-sm text-[#888] mt-1">Avg Confidence</div>
          </div>

          {/* Error Types */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-6">
            <div className="text-3xl font-bold text-pink-400">
              {metrics?.improvementMetrics?.uniqueErrorTypes ?? 0}
            </div>
            <div className="text-sm text-[#888] mt-1">Unique Error Types</div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/devmind/debug"
          className="group bg-[#111] rounded-xl border border-[#222] hover:border-purple-500/50 p-6 transition-all"
        >
          <div className="text-2xl mb-2">{'\uD83D\uDD0D'}</div>
          <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
            CodeTrace Debugger
          </h3>
          <p className="text-sm text-[#888] mt-1">
            Paste code + error {'\u2192'} get memory-aware AI debugging
          </p>
        </Link>

        <Link
          href="/devmind/docs"
          className="group bg-[#111] rounded-xl border border-[#222] hover:border-cyan-500/50 p-6 transition-all"
        >
          <div className="text-2xl mb-2">{'\uD83D\uDCCA'}</div>
          <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
            SmartDocs Generator
          </h3>
          <p className="text-sm text-[#888] mt-1">
            Generate learning reports from your debug history
          </p>
        </Link>
      </div>

      {/* Recent Sessions */}
      {stats && stats.recentSessions.length > 0 && (
        <div className="bg-[#111] rounded-xl border border-[#222] p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Debug Sessions</h3>
          <div className="space-y-3">
            {stats.recentSessions.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-900/50">
                    {session.errorType}
                  </span>
                  <span className="text-sm text-[#aaa]">
                    {session.conceptGap || 'Unknown'}
                  </span>
                  <span className="text-xs text-[#555] uppercase">
                    {session.language}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 bg-[#222] rounded-full h-1.5">
                    <div
                      className="bg-purple-500 h-1.5 rounded-full"
                      style={{ width: `${session.confidenceLevel * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-[#555]">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Concept Weaknesses */}
      {metrics && metrics.conceptWeaknesses.length > 0 && (
        <div className="bg-[#111] rounded-xl border border-[#222] p-6">
          <h3 className="text-lg font-semibold mb-4">Concept Weaknesses</h3>
          <div className="flex flex-wrap gap-2">
            {metrics.conceptWeaknesses.map((w, i) => (
              <span
                key={i}
                className="px-3 py-1 rounded-full text-sm bg-yellow-900/20 text-yellow-400 border border-yellow-900/40"
              >
                {w.concept} ({w.count}x)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
