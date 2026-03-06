'use client';

import { useState } from 'react';
import { useDevMindAuth } from '@/hooks/use-devmind-auth';

interface CodeSection {
  lineRange: string;
  code: string;
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
  relatedWeakness: string | null;
}

interface CodeExplanation {
  title: string;
  overview: string;
  sections: CodeSection[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  keyConcepts: string[];
  personalNotes: string[];
}

interface ExplainResult {
  success: boolean;
  explanation: CodeExplanation;
  personalizedTips: string[];
}

const LANGUAGES = ['javascript','typescript','python','java','c','cpp','csharp','go','rust','ruby','php','swift','kotlin','html','css','sql','bash','other'];

const diffColors: Record<string, { bg: string; text: string; border: string }> = {
  easy: { bg: 'rgba(52,211,153,0.08)', text: '#34d399', border: 'rgba(52,211,153,0.15)' },
  medium: { bg: 'rgba(251,191,36,0.08)', text: '#fbbf24', border: 'rgba(251,191,36,0.15)' },
  hard: { bg: 'rgba(248,113,113,0.08)', text: '#f87171', border: 'rgba(248,113,113,0.15)' },
};

const complexCfg: Record<string, { label: string; color: string }> = {
  beginner: { label: 'Beginner', color: '#34d399' },
  intermediate: { label: 'Intermediate', color: '#fbbf24' },
  advanced: { label: 'Advanced', color: '#f87171' },
};

export default function ExplainPage() {
  const { user, guestName } = useDevMindAuth();
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const username = user?.displayName || user?.username || guestName || 'anonymous';

  async function handleExplain() {
    if (!code.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedSection(null);
    try {
      const res = await fetch('/api/devmind/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: username, language, code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to explain code');
      setResult(data);
      setExpandedSection(0);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Code Explain</h1>
        <p className="text-[#666] text-sm mt-1">Paste any code — get personalized, section-by-section breakdown</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Language selector */}
        <div>
          <label className="block text-xs text-[#666] mb-1">Language</label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-sm focus:outline-none focus:border-cyan-500 transition-colors"
          >
            {LANGUAGES.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
          </select>
        </div>

        {/* Code input */}
        <div className="lg:col-span-3">
          <label className="block text-xs text-[#666] mb-1">
            Code <span className="text-[#444]">({code.length}/15000)</span>
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={`// Paste your ${language} code to explain...`}
            rows={8}
            maxLength={15000}
            className="w-full px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#333] text-green-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-cyan-500 transition-colors resize-y"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleExplain}
          disabled={loading || !code.trim()}
          className="px-6 py-2.5 rounded-lg font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 active:scale-[0.98]"
        >
          {loading ? 'Explaining...' : 'Explain Code'}
        </button>
        <span className="text-xs text-[#555]">
          Personalized for <span className="text-cyan-400 font-mono">{username}</span>
        </span>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overview */}
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h2 className="text-lg font-bold text-white">{result.explanation.title}</h2>
              <span className="px-3 py-1 rounded-full text-xs font-semibold border"
                style={{ color: complexCfg[result.explanation.complexity]?.color, borderColor: complexCfg[result.explanation.complexity]?.color + '40', background: complexCfg[result.explanation.complexity]?.color + '15' }}>
                {complexCfg[result.explanation.complexity]?.label}
              </span>
            </div>
            <p className="text-[#888] text-sm leading-relaxed">{result.explanation.overview}</p>
            {result.explanation.keyConcepts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.explanation.keyConcepts.map((c, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md text-xs bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]">{c}</span>
                ))}
              </div>
            )}
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {result.explanation.sections.map((section, i) => {
              const dc = diffColors[section.difficulty];
              const isExpanded = expandedSection === i;
              return (
                <div key={i} className="rounded-xl border overflow-hidden" style={{ background: dc.bg, borderColor: dc.border }}>
                  <button
                    className="w-full text-left px-5 py-3.5 flex items-center justify-between"
                    onClick={() => setExpandedSection(isExpanded ? null : i)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[#444]">L{section.lineRange}</span>
                      <span className="text-sm font-semibold" style={{ color: dc.text }}>{section.concept}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded border" style={{ color: dc.text, borderColor: dc.border }}>
                        {section.difficulty}
                      </span>
                      <span className="text-[#555] text-sm">{isExpanded ? '\u2212' : '+'}</span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-3 border-t" style={{ borderColor: dc.border }}>
                      <pre className="mt-3 p-3 rounded-lg bg-[#0a0a0a] border border-[#222] text-green-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                        {section.code}
                      </pre>
                      <p className="text-sm text-[#ccc] leading-relaxed">{section.explanation}</p>
                      {section.relatedWeakness && (
                        <div className="p-2 rounded-lg bg-yellow-900/10 border border-yellow-900/30">
                          <span className="text-xs text-yellow-400">Related to your weakness: {section.relatedWeakness}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tips */}
          {result.personalizedTips.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide mb-3">Personalized Tips</h3>
              <ul className="space-y-2">
                {result.personalizedTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                    <span className="text-purple-500 mt-0.5">-</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Personal Notes */}
          {result.explanation.personalNotes.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wide mb-3">Notes for You</h3>
              <ul className="space-y-2">
                {result.explanation.personalNotes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#888]">
                    <span className="text-cyan-500 mt-0.5">-</span> {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
