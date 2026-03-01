'use client';

import { useState } from 'react';

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

export default function PracticePage() {
  const [userId, setUserId] = useState('demo-user');
  const [language, setLanguage] = useState('python');
  const [questionCount, setQuestionCount] = useState(5);
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState<Record<number, boolean>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  const generateQuiz = async () => {
    setLoading(true);
    setError('');
    setQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswers({});
    setShowResult({});
    setQuizCompleted(false);

    try {
      const res = await fetch('/api/devmind/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, language, questionCount }),
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
    if (showResult[questionId]) return; // Already answered
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
    return {
      correct,
      total: quiz.questions.length,
      percentage: Math.round((correct / quiz.questions.length) * 100),
    };
  };

  const difficultyColor = (d: string) => {
    switch (d) {
      case 'easy': return 'text-green-400 bg-green-400/10 border-green-400/30';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
      case 'hard': return 'text-red-400 bg-red-400/10 border-red-400/30';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-3xl">{'\uD83E\uDDE9'}</span>
          Practice Arena
        </h1>
        <p className="text-[#888] mt-1">
          AI-generated quizzes targeting your weak concepts from debug history
        </p>
      </div>

      {/* Quiz Setup */}
      {!quiz && !loading && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Generate Your Quiz</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* User ID */}
            <div>
              <label className="block text-sm text-[#888] mb-1.5">User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
                placeholder="your-user-id"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="java">Java</option>
                <option value="c++">C++</option>
                <option value="rust">Rust</option>
              </select>
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-sm text-[#888] mb-1.5">Questions</label>
              <select
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full bg-[#0a0a0a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
              >
                <option value={3}>3 Questions (Quick)</option>
                <option value={5}>5 Questions (Standard)</option>
                <option value={7}>7 Questions (Deep)</option>
                <option value={10}>10 Questions (Marathon)</option>
              </select>
            </div>
          </div>

          <button
            onClick={generateQuiz}
            className="w-full bg-linear-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-lg transition-all text-sm"
          >
            {'\uD83E\uDDE0'} Generate Personalized Quiz
          </button>

          <p className="text-xs text-[#555] mt-3 text-center">
            Questions are generated based on your debug history and weak concepts
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="bg-[#111] border border-[#222] rounded-xl p-12 text-center">
          <div className="inline-block animate-spin text-4xl mb-4">{'\uD83E\uDDE0'}</div>
          <p className="text-[#888]">Analyzing your weak spots and generating quiz...</p>
          <div className="mt-4 w-48 mx-auto h-1.5 bg-[#222] rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-purple-500 to-cyan-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-4 underline hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Quiz Active */}
      {quiz && !quizCompleted && (
        <div>
          {/* Quiz Header */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">{quiz.title}</h2>
                <div className="flex gap-2 mt-1">
                  {quiz.focusConcepts.map((c, i) => (
                    <span key={i} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {currentQuestion + 1}
                  <span className="text-sm text-[#666]">/{quiz.questions.length}</span>
                </div>
                <div className="text-xs text-[#666]">Question</div>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 h-1.5 bg-[#222] rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                style={{ width: `${((currentQuestion + 1) / quiz.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Card */}
          {(() => {
            const q = quiz.questions[currentQuestion];
            if (!q) return null;
            const answered = showResult[q.id];
            const selected = selectedAnswers[q.id];
            const isCorrect = selected === q.correctAnswer;

            return (
              <div className="bg-[#111] border border-[#222] rounded-xl p-6">
                {/* Difficulty + Concept badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${difficultyColor(q.difficulty)}`}>
                    {q.difficulty}
                  </span>
                  <span className="text-xs bg-[#1a1a1a] text-[#888] px-2 py-0.5 rounded-full">
                    {q.concept}
                  </span>
                </div>

                {/* Question */}
                <h3 className="text-lg font-medium mb-5 leading-relaxed whitespace-pre-wrap">
                  {q.question}
                </h3>

                {/* Options */}
                <div className="space-y-3 mb-6">
                  {q.options.map((opt, i) => {
                    const letter = ['A', 'B', 'C', 'D'][i];
                    let optionStyle = 'border-[#333] hover:border-[#555] hover:bg-[#1a1a1a]';
                    
                    if (selected === i && !answered) {
                      optionStyle = 'border-purple-500 bg-purple-500/10';
                    }
                    if (answered) {
                      if (i === q.correctAnswer) {
                        optionStyle = 'border-green-500 bg-green-500/10';
                      } else if (i === selected && !isCorrect) {
                        optionStyle = 'border-red-500 bg-red-500/10';
                      } else {
                        optionStyle = 'border-[#222] opacity-50';
                      }
                    }

                    return (
                      <button
                        key={i}
                        onClick={() => selectAnswer(q.id, i)}
                        disabled={!!answered}
                        className={`w-full text-left p-3.5 rounded-lg border transition-all flex items-start gap-3 ${optionStyle}`}
                      >
                        <span className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          selected === i ? 'bg-purple-500 text-white' : 'bg-[#222] text-[#888]'
                        } ${answered && i === q.correctAnswer ? 'bg-green-500 text-white' : ''}
                        ${answered && i === selected && !isCorrect ? 'bg-red-500 text-white' : ''}`}>
                          {answered && i === q.correctAnswer ? '\u2713' : answered && i === selected && !isCorrect ? '\u2717' : letter}
                        </span>
                        <span className="text-sm leading-relaxed whitespace-pre-wrap">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                {!answered ? (
                  <button
                    onClick={() => checkAnswer(q.id)}
                    disabled={selected === undefined}
                    className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                      selected !== undefined
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : 'bg-[#222] text-[#555] cursor-not-allowed'
                    }`}
                  >
                    Check Answer
                  </button>
                ) : (
                  <div>
                    {/* Explanation */}
                    <div className={`p-4 rounded-lg mb-4 ${
                      isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{isCorrect ? '\u2705' : '\u274C'}</span>
                        <span className={`font-semibold text-sm ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {isCorrect ? 'Correct!' : 'Incorrect'}
                        </span>
                      </div>
                      <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-wrap">
                        {q.explanation}
                      </p>
                    </div>

                    <button
                      onClick={nextQuestion}
                      className="w-full bg-linear-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-lg transition-all text-sm"
                    >
                      {currentQuestion < quiz.questions.length - 1 ? 'Next Question \u2192' : 'See Results \uD83C\uDFAF'}
                    </button>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Question Dots Navigator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {quiz.questions.map((q, i) => {
              let dotColor = 'bg-[#333]'; // unanswered
              if (showResult[q.id]) {
                dotColor = selectedAnswers[q.id] === q.correctAnswer ? 'bg-green-500' : 'bg-red-500';
              } else if (i === currentQuestion) {
                dotColor = 'bg-purple-500';
              }
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-3 h-3 rounded-full transition-all ${dotColor} ${
                    i === currentQuestion ? 'scale-125' : 'hover:scale-110'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz Results */}
      {quizCompleted && quiz && (
        <div className="space-y-6">
          {/* Score Card */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-8 text-center">
            <div className="text-6xl mb-4">
              {getScore().percentage >= 80 ? '\uD83C\uDFC6' : getScore().percentage >= 50 ? '\uD83D\uDCAA' : '\uD83D\uDCDA'}
            </div>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <div className="text-5xl font-bold bg-linear-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              {getScore().percentage}%
            </div>
            <p className="text-[#888]">
              {getScore().correct} out of {getScore().total} correct
            </p>
            <div className="mt-4 w-64 mx-auto h-3 bg-[#222] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  getScore().percentage >= 80
                    ? 'bg-green-500'
                    : getScore().percentage >= 50
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${getScore().percentage}%` }}
              />
            </div>
            <p className="mt-4 text-sm text-[#666]">
              {getScore().percentage >= 80
                ? 'Excellent! You\'re mastering these concepts.'
                : getScore().percentage >= 50
                ? 'Good progress! Keep practicing your weak areas.'
                : 'Keep learning! Use the CodeTrace Debugger to build understanding.'}
            </p>
          </div>

          {/* Question Review */}
          <div className="bg-[#111] border border-[#222] rounded-xl p-6">
            <h3 className="font-semibold mb-4">Question Review</h3>
            <div className="space-y-3">
              {quiz.questions.map((q) => {
                const isCorrect = selectedAnswers[q.id] === q.correctAnswer;
                return (
                  <div
                    key={q.id}
                    className={`p-3 rounded-lg border ${
                      isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">{isCorrect ? '\u2705' : '\u274C'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${difficultyColor(q.difficulty)}`}>
                            {q.difficulty}
                          </span>
                          <span className="text-xs text-[#666]">{q.concept}</span>
                          {!isCorrect && (
                            <span className="text-xs text-[#888]">
                              {'\u2192'} Correct: {['A', 'B', 'C', 'D'][q.correctAnswer]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={generateQuiz}
              className="flex-1 bg-linear-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-lg transition-all text-sm"
            >
              {'\uD83D\uDD04'} Generate New Quiz
            </button>
            <button
              onClick={() => {
                setQuiz(null);
                setQuizCompleted(false);
              }}
              className="px-6 bg-[#222] hover:bg-[#333] text-white font-semibold py-3 rounded-lg transition-all text-sm"
            >
              {'\u2699\uFE0F'} Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
