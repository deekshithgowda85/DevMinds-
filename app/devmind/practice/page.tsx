'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizData {
  title: string;
  focusConcepts: string[];
  questions: QuizQuestion[];
  generatedAt: string;
}

const diffBadge = (d: string) =>
  d === 'easy' ? 'bg-green-900/30 text-green-400 border-green-900/50' :
  d === 'medium' ? 'bg-yellow-900/30 text-yellow-400 border-yellow-900/50' :
  'bg-red-900/30 text-red-400 border-red-900/50';

export default function PracticePage() {
  const { user } = useAuth();
  const [language, setLanguage] = useState('python');
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  const username = user?.isAnonymous
    ? 'guest'
    : user?.displayName || user?.email?.split('@')[0] || 'anonymous';

  const generateQuiz = async () => {
    setLoading(true); setError(''); setQuiz(null);
    setCurrentQuestion(0); setSelectedAnswers({}); setShowResult({}); setQuizCompleted(false);
    try {
      const res = await fetch('/api/devmind/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: username, language, questionCount }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setQuiz(data.quiz);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
    } finally {
      setLoading(false);
    }
  };

  const selectAnswer = (questionId: number, answerIndex: number) => {
    if (showResult[questionId]) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: answerIndex }));
  };

  const checkAnswer = (questionId: number) => {
    setShowResult((prev) => ({ ...prev, [questionId]: true }));
  };

  const nextQuestion = () => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion((prev) => prev + 1);
    } else {
      setQuizCompleted(true);
    }
  };

  const getScore = () => {
    if (!quiz) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    quiz.questions.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctAnswer) correct++;
    });
    return { correct, total: quiz.questions.length, percentage: Math.round((correct / quiz.questions.length) * 100) };
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Practice Quiz</h1>
        <p className="text-[#666] text-sm mt-1">Test your knowledge with adaptive quizzes based on your learning history</p>
      </div>

      {/* Controls */}
      <div className="bg-[#111] rounded-xl border border-[#222] p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-[#666] mb-1">Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            >
              {['python','javascript','typescript','java','c','cpp','go','rust','ruby','php'].map((l) => (
                <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-[#666] mb-1">Questions</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#333] text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
            >
              {[3, 5, 7, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          <button
            onClick={generateQuiz}
            disabled={loading}
            className="px-5 py-2 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-40 transition-all active:scale-[0.98]"
          >
            {loading ? 'Generating...' : 'Generate Quiz'}
          </button>
          <span className="text-xs text-[#555]">
            For <span className="text-purple-400 font-mono">{username}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/50 text-red-400 text-sm">{error}</div>
      )}

      {quiz && !quizCompleted && (
        <div className="space-y-4">
          {/* Progress */}
          <div className="flex items-center justify-between text-sm text-[#555]">
            <span>Question {currentQuestion + 1} of {quiz.questions.length}</span>
            <div className="w-48 bg-[#222] rounded-full h-1.5">
              <div className="bg-purple-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }} />
            </div>
          </div>

          {/* Question */}
          {quiz.questions[currentQuestion] && (() => {
            const q = quiz.questions[currentQuestion];
            const answered = showResult[q.id];
            const selected = selectedAnswers[q.id];
            const isCorrect = selected === q.correctAnswer;
            return (
              <div className="bg-[#111] rounded-xl border border-[#222] p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-white font-medium leading-relaxed">{q.question}</p>
                  <span className={`px-2 py-0.5 rounded text-xs border flex-shrink-0 ${diffBadge(q.difficulty)}`}>{q.difficulty}</span>
                </div>
                <p className="text-xs text-[#555]">{q.concept}</p>

                <div className="space-y-2">
                  {q.options.map((option, i) => {
                    let cls = 'border border-[#2a2a2a] text-[#ccc] hover:border-[#444]';
                    if (answered) {
                      if (i === q.correctAnswer) cls = 'border-green-500/50 bg-green-900/20 text-green-300';
                      else if (i === selected) cls = 'border-red-500/50 bg-red-900/20 text-red-300';
                      else cls = 'border-[#222] text-[#555]';
                    } else if (i === selected) {
                      cls = 'border-purple-500/50 bg-purple-900/20 text-purple-300';
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => selectAnswer(q.id, i)}
                        disabled={answered}
                        className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${cls}`}
                      >
                        <span className="font-mono text-[#555] mr-2">{['A','B','C','D'][i]}.</span> {option}
                      </button>
                    );
                  })}
                </div>

                {answered && (
                  <div className={`p-3 rounded-lg text-sm ${isCorrect ? 'bg-green-900/20 border border-green-900/40 text-green-300' : 'bg-red-900/20 border border-red-900/40 text-red-300'}`}>
                    <strong>{isCorrect ? 'Correct!' : 'Incorrect.'}</strong> {q.explanation}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  {selected !== undefined && !answered && (
                    <button onClick={() => checkAnswer(q.id)} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 transition-colors">
                      Check Answer
                    </button>
                  )}
                  {answered && (
                    <button onClick={nextQuestion} className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#222] hover:bg-[#333] transition-colors">
                      {currentQuestion < quiz.questions.length - 1 ? 'Next Question' : 'See Results'}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {quizCompleted && quiz && (() => {
        const score = getScore();
        return (
          <div className="bg-[#111] rounded-xl border border-[#222] p-8 text-center space-y-4">
            <h2 className="text-2xl font-bold text-white">Quiz Complete!</h2>
            <div className="text-5xl font-black" style={{ color: score.percentage >= 80 ? '#22c55e' : score.percentage >= 50 ? '#f59e0b' : '#ef4444' }}>
              {score.percentage}%
            </div>
            <p className="text-[#888]">{score.correct} / {score.total} correct</p>
            <button onClick={generateQuiz} disabled={loading}
              className="px-6 py-2.5 rounded-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-40">
              {loading ? 'Generating...' : 'Try Another Quiz'}
            </button>
          </div>
        );
      })()}
    </div>
  );
}
