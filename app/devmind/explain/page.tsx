'use client';

import { useState, useEffect } from 'react';

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

const complexCfg: Record<string, { label: string; color: string; icon: string }> = {
  beginner: { label: 'Beginner', color: '#34d399', icon: '\uD83C\uDF31' },
  intermediate: { label: 'Intermediate', color: '#fbbf24', icon: '\u26A1' },
  advanced: { label: 'Advanced', color: '#f87171', icon: '\uD83D\uDD25' },
};

export default function ExplainPage() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('devmind-userId');
    if (stored) setUserId(stored);
  }, []);

  async function handleExplain() {
    if (!code.trim() || !userId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedSection(null);
    try {
      const res = await fetch('/api/devmind/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, language, code }),
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
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl px-8 py-6"
        style={{ background: 'radial-gradient(ellipse at 20% 50%, rgba(6,182,212,0.12), transparent 60%), rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.2)' }}
          >{'\uD83D\uDCA1'}</div>
          <div>
            <h1 className="text-2xl font-black tracking-tight"
              style={{ background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
            >Code Explain</h1>
            <p className="text-xs text-[#666] mt-0.5">Paste any code {'\u2014'} get personalized, section-by-section breakdown</p>
          </div>
        </div>
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[10px] text-[#666] uppercase tracking-wider font-semibold">Paste your code</label>
            <span className="text-[10px] font-mono" style={{ color: code.length > 15000 ? '#f87171' : '#444' }}>{code.length}/15,000</span>
          </div>
          <textarea value={code} onChange={(e) => setCode(e.target.value)}
            placeholder="// Paste any code here..."
            rows={16} spellCheck={false}
            className="w-full px-4 py-3 rounded-2xl font-mono text-sm leading-relaxed focus:outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#e2e8f0' }}
          />
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] text-[#666] mb-1.5 uppercase tracking-wider font-semibold">Language</label>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none appearance-none"
              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {LANGUAGES.map((l) => <option key={l} value={l} style={{ background: '#1a1a1a', color: '#ededed' }}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-[#666] mb-1.5 uppercase tracking-wider font-semibold">Your ID</label>
            <input type="text" value={userId}
              onChange={(e) => { setUserId(e.target.value); localStorage.setItem('devmind-userId', e.target.value); }}
              placeholder="user-id"
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white placeholder-[#444] focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            />
          </div>

          <button onClick={handleExplain}
            disabled={loading || !code.trim() || !userId.trim() || code.length > 15000}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: loading ? '#222' : 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              boxShadow: loading ? 'none' : '0 4px 24px rgba(6,182,212,0.3)',
            }}
          >
            {loading ? <span className="flex items-center justify-center gap-2"><span className="animate-spin">{'\u23F3'}</span> Analyzing...</span> : '\uD83D\uDCA1 Explain Code'}
          </button>

          {result && (
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] text-[#555] uppercase tracking-wider font-semibold">Analysis</div>
              <div className="flex items-center gap-2">
                <span>{complexCfg[result.explanation.complexity]?.icon}</span>
                <span className="text-sm font-bold" style={{ color: complexCfg[result.explanation.complexity]?.color }}>
                  {complexCfg[result.explanation.complexity]?.label}
                </span>
              </div>
              <div className="text-[10px] text-[#555]">{result.explanation.sections.length} sections  /  {result.explanation.keyConcepts.length} concepts</div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl p-4 text-sm" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#fca5a5' }}>
          <span className="font-bold">Error:</span> {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-2xl p-6 animate-pulse" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
              <div className="h-4 rounded w-1/3 mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 rounded w-full mb-2" style={{ background: 'rgba(255,255,255,0.03)' }} />
              <div className="h-3 rounded w-2/3" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-5">
          {/* Title + Overview */}
          <div className="rounded-2xl p-7"
            style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.1), transparent 60%), radial-gradient(ellipse at 70% 100%, rgba(6,182,212,0.08), transparent 60%), rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.12)' }}
          >
            <h2 className="text-xl font-black text-white mb-2">{result.explanation.title}</h2>
            <p className="text-sm text-[#999] leading-relaxed">{result.explanation.overview}</p>
            <div className="flex flex-wrap gap-2 mt-4">
              {result.explanation.keyConcepts.map((c, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.2)' }}
                >{c}</span>
              ))}
            </div>
          </div>

          {/* Personalized Alerts */}
          {result.personalizedTips.length > 0 && (
            <div className="rounded-2xl p-5" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.12)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span>{'\uD83C\uDFAF'}</span>
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fbbf24' }}>Personalized Alerts</span>
              </div>
              {result.personalizedTips.map((tip, i) => (
                <p key={i} className="text-sm leading-relaxed" style={{ color: '#fcd34d' }}>{tip}</p>
              ))}
            </div>
          )}

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent)' }} />
              <span className="text-xs font-bold uppercase tracking-widest text-[#555]">Breakdown</span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent)' }} />
            </div>

            {result.explanation.sections.map((section, i) => {
              const isExpanded = expandedSection === i;
              const dc = diffColors[section.difficulty] || diffColors.medium;
              return (
                <div key={i} className="rounded-2xl overflow-hidden transition-all"
                  style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${isExpanded ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.06)'}` }}
                >
                  <button onClick={() => setExpandedSection(isExpanded ? null : i)}
                    className="w-full text-left px-5 py-4 flex items-center justify-between transition-colors"
                    style={{ background: isExpanded ? 'rgba(124,58,237,0.04)' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg"
                        style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}
                      >L{section.lineRange}</span>
                      <span className="text-sm font-bold text-white">{section.concept}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                        style={{ background: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}
                      >{section.difficulty}</span>
                      {section.relatedWeakness && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                          style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.15)' }}
                        >{'\u26A0'} Weak Area</span>
                      )}
                    </div>
                    <span className="text-[#555] text-xs transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>{'\u25BC'}</span>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3">
                      <pre className="text-sm font-mono overflow-x-auto rounded-xl p-4"
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', color: '#d4d4d4' }}
                      ><code>{section.code}</code></pre>
                      <div className="text-sm text-[#bbb] leading-relaxed">{section.explanation}</div>
                      {section.relatedWeakness && (
                        <div className="rounded-xl p-3.5 text-sm"
                          style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.12)', color: '#fca5a5' }}
                        ><span className="font-bold">{'\u26A0'} Related to your weakness:</span> {section.relatedWeakness}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Personal Notes */}
          {result.explanation.personalNotes.length > 0 && (
            <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <span>{'\uD83E\uDDE0'}</span> Personalized Learning Notes
              </h3>
              <div className="space-y-3">
                {result.explanation.personalNotes.map((note, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm text-[#bbb]">
                    <span className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                      style={{ background: 'rgba(124,58,237,0.12)', color: '#a78bfa' }}
                    >{i + 1}</span>
                    <p className="leading-relaxed">{note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
