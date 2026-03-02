"use client";

import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  concept: string;
  difficulty: string;
}

export function DevMindPractice({ language }: { language: string }) {
  const [userId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("devmind-userId");
      if (stored) return stored;
      const id = "user-" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem("devmind-userId", id);
      return id;
    }
    return "user-default";
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError("");
    setQuestions([]);
    setCurrentQ(0);
    setScore(0);
    setFinished(false);
    setSelectedAnswer(null);
    setAnswered(false);

    try {
      const res = await fetch("/api/devmind/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, language, questionCount: 5 }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to generate quiz");
        return;
      }

      setQuestions(data.quiz?.questions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (answered) return;
    setSelectedAnswer(idx);
    setAnswered(true);
    if (idx === questions[currentQ].correctAnswer) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQ + 1 >= questions.length) {
      setFinished(true);
    } else {
      setCurrentQ((q) => q + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <ScrollArea className="flex-1">
      <div className="p-3 space-y-3">
        {questions.length === 0 && !finished && (
          <>
            <div className="text-xs text-muted-foreground">
              AI-generated quiz based on your weak concepts and debug history.
            </div>
            <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="sm">
              {isLoading ? "Generating..." : "\uD83C\uDFAF Start Quiz"}
            </Button>
          </>
        )}

        {error && (
          <div className="p-2 rounded border border-red-500/50 bg-red-500/10 text-xs text-red-400">{error}</div>
        )}

        {/* Active question */}
        {questions.length > 0 && !finished && (
          <div className="space-y-3">
            {/* Progress */}
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                Question {currentQ + 1}/{questions.length}
              </span>
              <span>Score: {score}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className="h-1.5 rounded-full bg-blue-500 transition-all"
                style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
              />
            </div>

            {/* Question */}
            <div className="p-2 rounded border bg-muted/30 text-xs">
              <div className="font-semibold mb-1">{questions[currentQ].question}</div>
              <div className="text-[10px] text-muted-foreground">
                {questions[currentQ].concept} \u2022 {questions[currentQ].difficulty}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-1">
              {questions[currentQ].options.map((opt, i) => {
                let optClass = "border bg-muted/20 hover:bg-muted/40";
                if (answered) {
                  if (i === questions[currentQ].correctAnswer) {
                    optClass = "border border-green-500/50 bg-green-500/10";
                  } else if (i === selectedAnswer && i !== questions[currentQ].correctAnswer) {
                    optClass = "border border-red-500/50 bg-red-500/10";
                  }
                } else if (i === selectedAnswer) {
                  optClass = "border border-blue-500/50 bg-blue-500/10";
                }

                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={answered}
                    className={`w-full text-left px-3 py-2 rounded text-xs ${optClass} transition-colors`}
                  >
                    <span className="font-mono font-bold mr-2">{optionLabels[i]}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {answered && (
              <>
                <div className="p-2 rounded border bg-blue-500/10 border-blue-500/30 text-xs">
                  <div className="font-semibold mb-1 text-blue-400">{'\uD83D\uDCA1'} Explanation:</div>
                  <div className="text-muted-foreground">{questions[currentQ].explanation}</div>
                </div>
                <Button onClick={handleNext} className="w-full" size="sm">
                  {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Finished */}
        {finished && (
          <div className="space-y-3 text-center">
            <div className="text-2xl font-bold">
              {score}/{questions.length}
            </div>
            <div className="text-xs text-muted-foreground">
              {score === questions.length
                ? "Perfect score!"
                : score >= questions.length * 0.7
                ? "Great job!"
                : "Keep practicing!"}
            </div>
            <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="sm">
              {isLoading ? "Generating..." : "New Quiz"}
            </Button>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
