'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useDevMindAuth } from '@/hooks/use-devmind-auth';
import { Bug, FileText, BarChart2, BookOpen, Dumbbell } from 'lucide-react';

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
  const { user, loading, guestName } = useDevMindAuth();
  const [stats, setStats] = useState<MemoryStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const username = user?.displayName || user?.username || guestName || '';

  useEffect(() => {
    if (username) loadStats(username);
  }, [username]);

  async function loadStats(uid: string) {
    if (!uid) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/devmind/memory?userId=${encodeURIComponent(uid)}`);
      const data = await res.json();
      if (data.success) setStats(data);
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setStatsLoading(false);
    }
  }

  const metrics = stats?.learningMetrics;
  const avgConf = metrics?.improvementMetrics?.avgConfidence ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#555] text-sm animate-pulse">Loading...</div>
      </div>
    );
  }

  const quickLinks = [
    { href: '/devmind/debug', label: 'CodeTrace Debug', desc: 'Paste code + error for memory-aware AI debugging', icon: Bug },
    { href: '/devmind/explain', label: 'Code Explain', desc: 'Get personalized, section-by-section code breakdowns', icon: BookOpen },
    { href: '/devmind/docs', label: 'SmartDocs', desc: 'Generate learning reports from your debug history', icon: FileText },
    { href: '/devmind/practice', label: 'Practice Quiz', desc: 'Test your knowledge with adaptive quizzes', icon: Dumbbell },
    { href: '/devmind/analytics', label: 'Analytics', desc: 'Deep insights into your debugging patterns', icon: BarChart2 },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
          Code Analyzer
        </h1>
        <p className="text-[#666] text-sm mt-1">
          {username ? `Welcome back, ${username}` : 'Memory-Driven AI Debugging & Learning System'}
        </p>
      </div>

      {/* Stats */}
      {statsLoading && (
        <div className="text-[#555] text-sm animate-pulse">Loading your stats...</div>
      )}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <p className="text-3xl font-bold text-purple-400">{stats.totalSessions}</p>
            <p className="text-xs text-[#666] mt-1">Debug Sessions</p>
          </div>
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <p className="text-3xl font-bold text-cyan-400">{(avgConf * 100).toFixed(0)}%</p>
            <p className="text-xs text-[#666] mt-1">Avg Confidence</p>
          </div>
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <p className="text-3xl font-bold text-pink-400">
              {metrics?.improvementMetrics?.uniqueErrorTypes ?? 0}
            </p>
            <p className="text-xs text-[#666] mt-1">Unique Error Types</p>
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <p className="text-xs text-[#444] uppercase tracking-widest font-medium mb-3">Explore</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="group bg-[#111] rounded-xl border border-[#1e1e1e] hover:border-[#333] p-5 transition-all hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-[#777] group-hover:text-purple-400 transition-colors" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{link.label}</p>
                    <p className="text-xs text-[#555] mt-0.5 leading-relaxed">{link.desc}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Sessions */}
      {stats && stats.recentSessions.length > 0 && (
        <div className="bg-[#111] rounded-xl border border-[#1e1e1e] p-5">
          <p className="text-sm font-semibold text-white mb-4">Recent Debug Sessions</p>
          <div className="space-y-2">
            {stats.recentSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="flex items-center justify-between py-2.5 border-b border-[#1a1a1a] last:border-0">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded text-xs font-mono bg-red-900/30 text-red-400 border border-red-900/50">
                    {session.errorType}
                  </span>
                  <span className="text-sm text-[#888]">{session.conceptGap || 'Unknown'}</span>
                  <span className="text-xs text-[#444] uppercase">{session.language}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 bg-[#222] rounded-full h-1.5">
                    <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${session.confidenceLevel * 100}%` }} />
                  </div>
                  <span className="text-xs text-[#444]">{new Date(session.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weaknesses */}
      {metrics && metrics.conceptWeaknesses.length > 0 && (
        <div className="bg-[#111] rounded-xl border border-[#1e1e1e] p-5">
          <p className="text-sm font-semibold text-white mb-3">Concept Weaknesses</p>
          <div className="flex flex-wrap gap-2">
            {metrics.conceptWeaknesses.map((w, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs bg-yellow-900/20 text-yellow-400 border border-yellow-900/30">
                {w.concept} ({w.count}x)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}



