// ─── DevMind Quiz Generator API ──────────────────────────────
// POST /api/devmind/quiz — Generate practice quiz based on user's weak concepts
// GET  /api/devmind/quiz — Get quiz history / stats

import { NextRequest, NextResponse } from 'next/server';
import { prisma, isDatabaseConfigured } from '@/lib/devmind/database/postgres';
import { callLLMForJSON, isGroqConfigured } from '@/lib/devmind/llm/groq';

// ─── Types ──────────────────────────────────────────────────

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
  concept: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface QuizResponse {
  success: boolean;
  quiz: {
    title: string;
    focusConcepts: string[];
    questions: QuizQuestion[];
    generatedAt: string;
  };
}

// ─── POST: Generate a quiz ──────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, language, questionCount } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    const lang = language || 'python';
    const count = Math.min(questionCount || 5, 10);

    // Check if Groq is configured
    if (!isGroqConfigured()) {
      return NextResponse.json({
        success: true,
        quiz: {
          title: `${lang} Practice Quiz (Offline)`,
          focusConcepts: ['general'],
          questions: [{
            id: 1, question: 'What does "undefined" mean in JavaScript?',
            options: ['A variable that was declared but not assigned a value', 'A syntax error', 'A null reference', 'An empty string'],
            correctAnswer: 0,
            explanation: 'In JavaScript, "undefined" means a variable has been declared but has not been assigned a value yet.',
            concept: 'Variable initialization', difficulty: 'easy' as const,
          }],
          generatedAt: new Date().toISOString(),
        },
        notice: 'GROQ_API_KEY not configured. Showing sample question. Add a valid key for AI-generated quizzes.',
      });
    }

    // Fetch user's weak concepts and past errors
    const [metrics, recentSessions] = await Promise.all([
      prisma.learningMetric.findUnique({ where: { userId } }).catch(() => null),
      prisma.debugSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
    ]);

    // Build context for quiz generation
    const weakConcepts = Array.isArray(metrics?.conceptWeaknesses)
      ? (metrics.conceptWeaknesses as Array<{ concept: string; count: number }>).map(
          (w) => w.concept
        )
      : [];

    const recurringMistakes = Array.isArray(metrics?.recurringMistakes)
      ? (metrics.recurringMistakes as Array<{ errorType: string; count: number }>).map(
          (m) => `${m.errorType} (${m.count}x)`
        )
      : [];

    const pastErrorTypes = [...new Set(recentSessions.map((s) => s.errorType))];
    const pastConceptGaps = [...new Set(recentSessions.map((s) => s.conceptGap))];

    // Generate quiz with LLM
    const systemPrompt = `You are a programming instructor creating a personalized quiz.
Generate exactly ${count} multiple-choice questions targeting the student's weak areas.

Student Profile:
- Primary language: ${lang}
- Weak concepts: ${weakConcepts.length > 0 ? weakConcepts.join(', ') : 'general programming'}
- Recurring mistake types: ${recurringMistakes.length > 0 ? recurringMistakes.join(', ') : 'none tracked yet'}
- Past error types: ${pastErrorTypes.length > 0 ? pastErrorTypes.join(', ') : 'none yet'}
- Concept gaps identified: ${pastConceptGaps.length > 0 ? pastConceptGaps.join(', ') : 'none yet'}

Rules:
- Each question must have exactly 4 options (A, B, C, D)
- Include code snippets in questions when relevant (use backtick formatting)
- correctAnswer is 0-indexed (0=A, 1=B, 2=C, 3=D)
- Mix difficulty levels
- Focus on practical coding scenarios, not trivia
- Make explanations educational — teach the concept

Return valid JSON with this exact schema:
{
  "title": "string — quiz title",
  "focusConcepts": ["concept1", "concept2"],
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A text", "B text", "C text", "D text"],
      "correctAnswer": 0,
      "explanation": "string — why this answer is correct",
      "concept": "string — concept being tested",
      "difficulty": "easy|medium|hard"
    }
  ]
}`;

    const userMessage = `Generate a ${count}-question ${lang} quiz focused on the student's weak areas. ${
      weakConcepts.length === 0 && pastErrorTypes.length === 0
        ? 'Since no history exists yet, create a general ' + lang + ' fundamentals quiz covering common beginner mistakes like off-by-one errors, type confusion, scope issues, and null/undefined handling.'
        : ''
    }`;

    const quizData = await callLLMForJSON<{
      title: string;
      focusConcepts: string[];
      questions: QuizQuestion[];
    }>(systemPrompt, userMessage, { temperature: 0.7 });

    const response: QuizResponse = {
      success: true,
      quiz: {
        title: quizData.title || `${lang} Practice Quiz`,
        focusConcepts: quizData.focusConcepts || weakConcepts,
        questions: (quizData.questions || []).map((q, i) => ({
          id: q.id || i + 1,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          concept: q.concept,
          difficulty: q.difficulty || 'medium',
        })),
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Quiz API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Quiz generation failed',
      },
      { status: 500 }
    );
  }
}

// ─── GET: Get quiz stats ────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId query param required' },
        { status: 400 }
      );
    }

    // Return user's learning metrics as quiz context
    let metrics = null;
    if (isDatabaseConfigured()) {
      metrics = await prisma.learningMetric.findUnique({
        where: { userId },
      }).catch(() => null);
    }

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions: metrics?.totalSessions ?? 0,
        weakConcepts: metrics?.conceptWeaknesses ?? [],
        recurringMistakes: metrics?.recurringMistakes ?? [],
      },
    });
  } catch (error) {
    console.error('[Quiz Stats API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
