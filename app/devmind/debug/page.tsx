'use client';

import { useState } from 'react';
import { useDevMindAuth } from '@/hooks/use-devmind-auth';

interface DebugResult {
  success: boolean;
  sessionId: string;
  result: {
    errorType: string;
    detectedConceptGap: string;
    explanationSummary: string;
    fix: string;
    confidenceLevel: number;
    isRecurring: boolean;
    learningTip: string;
    similarPastErrors: number;
  };
  memoryStats: {
    totalSessions: number;
    uniqueErrorTypes: number;
  };
}

const LANGUAGES = ['javascript','typescript','python','java','go','rust','c','cpp','csharp','ruby','php'];

export default function DebugPage() {
  const { user, guestName } = useDevMindAuth();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DebugResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<DebugResult[]>([]);

  const username = user?.displayName || user?.username || guestName || 'anonymous';

  async function handleDebug() {
    if (!code.trim() || !errorMessage.trim()) {
      setError('Please enter both code and error message.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/devmind/debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: username, language, code: code.trim(), errorMessage: errorMessage.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.error || 'Debug request failed'); return; }
      setResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 10));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">CodeTrace Debug</h1>
        <p className="text-[#666] text-sm mt-1">
          Paste your code and error — DevMind remembers your past mistakes and gives smarter fixes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Language Row */}
          <div className="flex gap-3 items-end">
            <div>
              <label className="block text-xs text-[#666] mb-1">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>{lang.charAt(0).toUpperCase() + lang.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="text-xs text-[#555] pb-2">
              Debugging as <span className="text-purple-400 font-mono">{username}</span>
            </div>
          </div>

          {/* Code Input */}
          <div>
            <label className="block text-xs text-[#666] mb-1">
              Your Code <span className="text-[#444]">({code.length}/10000)</span>
            </label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`// Paste your ${language} code here...`}
              rows={10}
              maxLength={10000}
              className="w-full px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#333] text-green-300 font-mono text-sm leading-relaxed focus:outline-none focus:border-purple-500 transition-colors resize-y"
            />
          </div>

          {/* Error Input */}
          <div>
            <label className="block text-xs text-[#666] mb-1">Error Message</label>
            <textarea
              value={errorMessage}
              onChange={(e) => setErrorMessage(e.target.value)}
              placeholder="TypeError: Cannot read properties of undefined..."
              rows={3}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-lg bg-[#0d0d0d] border border-[#333] text-red-400 font-mono text-sm focus:outline-none focus:border-red-500 transition-colors resize-y"
            />
          </div>

          <button
            onClick={handleDebug}
            disabled={loading || !code.trim() || !errorMessage.trim()}
            className="w-full py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 active:scale-[0.98]"
          >
            {loading ? 'Analyzing with Memory...' : 'Debug with Memory'}
          </button>

          {error && (
            <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">{error}</div>
          )}

          {result && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-5 space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-1 rounded-md text-sm font-bold bg-red-900/30 text-red-400 border border-red-900/50">
                    {result.result.errorType}
                  </span>
                  {result.result.isRecurring && (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-yellow-900/30 text-yellow-400 border border-yellow-900/50 animate-pulse">
                      RECURRING
                    </span>
                  )}
                  {result.result.similarPastErrors > 0 && (
                    <span className="px-2.5 py-1 rounded-md text-xs bg-blue-900/30 text-blue-400 border border-blue-900/50">
                      {result.result.similarPastErrors} similar past errors
                    </span>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-[#555] uppercase tracking-wide">Concept Gap</span>
                <p className="text-purple-300 font-medium mt-0.5">{result.result.detectedConceptGap}</p>
              </div>

              <div>
                <div className="flex justify-between text-xs text-[#555] mb-1">
                  <span>Confidence</span>
                  <span>{(result.result.confidenceLevel * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full bg-[#222] rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-700 bg-gradient-to-r from-purple-500 to-cyan-500"
                    style={{ width: `${result.result.confidenceLevel * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <span className="text-xs text-[#555] uppercase tracking-wide">Explanation</span>
                <p className="text-[#ccc] text-sm mt-1 leading-relaxed">{result.result.explanationSummary}</p>
              </div>

              <div>
                <span className="text-xs text-[#555] uppercase tracking-wide">Fix</span>
                <pre className="mt-1 p-3 rounded-lg bg-[#0a0a0a] border border-[#222] text-green-300 font-mono text-sm overflow-x-auto whitespace-pre-wrap">
                  {result.result.fix}
                </pre>
              </div>

              <div className="p-3 rounded-lg bg-purple-900/10 border border-purple-900/30">
                <span className="text-xs text-purple-400 uppercase tracking-wide">Learning Tip</span>
                <p className="text-[#ccc] text-sm mt-1">{result.result.learningTip}</p>
              </div>
            </div>
          )}
        </div>

        {/* Memory Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111] rounded-xl border border-[#222] p-5">
            <h3 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">Memory Insights</h3>
            {result ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-[#666]">Total Sessions</span>
                  <span className="text-sm font-bold text-white">{result.memoryStats.totalSessions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#666]">Error Types</span>
                  <span className="text-sm font-bold text-white">{result.memoryStats.uniqueErrorTypes}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#666]">Similar Past</span>
                  <span className="text-sm font-bold text-purple-400">{result.result.similarPastErrors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[#666]">Recurring</span>
                  <span className={`text-sm font-bold ${result.result.isRecurring ? 'text-yellow-400' : 'text-green-400'}`}>
                    {result.result.isRecurring ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#444]">Run a debug session to see memory stats.</p>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-[#111] rounded-xl border border-[#222] p-5">
              <h3 className="text-sm font-semibold text-[#666] uppercase tracking-wide mb-3">Session History</h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => setResult(h)}
                    className="w-full text-left p-2 rounded-lg bg-[#1a1a1a] hover:bg-[#222] transition-colors"
                  >
                    <p className="text-xs font-mono text-red-400 truncate">{h.result.errorType}</p>
                    <p className="text-[10px] text-[#555] mt-0.5">{(h.result.confidenceLevel * 100).toFixed(0)}% confidence</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
