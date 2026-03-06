// ─── DevMind Quiz Generator API ──────────────────────────────
// POST /api/devmind/quiz — Generate practice quiz based on user's weak concepts
// GET  /api/devmind/quiz — Get quiz history / stats

import { NextRequest, NextResponse } from 'next/server';
import { callLLMForJSON, isGroqConfigured } from '@/lib/devmind/llm/groq';
import { callGateway } from '@/lib/devmind/aws/gateway';
import { getUserSessions } from '@/lib/devmind/aws/sessions';

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

    // ── Try AWS Gateway first ──
    // Include timestamp in code field to prevent cache returning same quiz
    const gwResponse = await callGateway({
      userId, language: lang,
      code: `Generate unique quiz #${Date.now()} for ${lang} with ${count} questions`,
      actionType: 'quiz',
    });

    if (gwResponse?.success && gwResponse.data) {
      const d = gwResponse.data;
      console.log(`[Quiz API] AWS Gateway hit (cached: ${gwResponse.meta?.cached})`);
      const questions = Array.isArray(d.questions)
        ? (d.questions as Array<Record<string, unknown>>).map((q, i) => ({
            id: (q.id as number) || i + 1,
            question: (q.question as string) || '',
            options: Array.isArray(q.options) ? q.options as string[] : [],
            correctAnswer: typeof q.correctAnswer === 'string'
              ? ['A','B','C','D'].indexOf(q.correctAnswer as string)
              : (q.correctAnswer as number) ?? 0,
            explanation: (q.explanation as string) || '',
            concept: (q.concept as string) || '',
            difficulty: ((q.difficulty as string) || 'medium') as 'easy' | 'medium' | 'hard',
          }))
        : [];
      return NextResponse.json({
        success: true,
        quiz: {
          title: `${lang} Practice Quiz`,
          focusConcepts: ['general'],
          questions,
          generatedAt: new Date().toISOString(),
        },
        meta: gwResponse.meta,
      });
    }

    // ── Fallback: local Groq pipeline ──
    console.log('[Quiz API] Falling back to local Groq pipeline');

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

    // Fetch user's debug history from DynamoDB
    let recentSessions: Awaited<ReturnType<typeof getUserSessions>> = [];
    try {
      const allSessions = await getUserSessions(userId);
      recentSessions = allSessions.slice(-20);
    } catch { /* no history */ }

    // Build context for quiz generation
    const weakConcepts = [...new Set(recentSessions.map((s) => s.conceptGap).filter(Boolean))];

    // Count error types for recurring mistakes
    const errorCounts: Record<string, number> = {};
    recentSessions.forEach((s) => {
      errorCounts[s.errorType] = (errorCounts[s.errorType] || 0) + 1;
    });
    const recurringMistakes = Object.entries(errorCounts)
      .filter(([, count]) => count > 1)
      .map(([type, count]) => `${type} (${count}x)`);

    const pastErrorTypes = [...new Set(recentSessions.map((s) => s.errorType))];
    const pastConceptGaps = [...new Set(recentSessions.map((s) => s.conceptGap).filter(Boolean))];

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

    // Return user's learning stats from DynamoDB
    let sessions: Awaited<ReturnType<typeof getUserSessions>> = [];
    try {
      sessions = await getUserSessions(userId);
    } catch { /* no data */ }

    const errorCounts: Record<string, number> = {};
    const conceptCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      errorCounts[s.errorType] = (errorCounts[s.errorType] || 0) + 1;
      if (s.conceptGap) conceptCounts[s.conceptGap] = (conceptCounts[s.conceptGap] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions: sessions.length,
        weakConcepts: Object.entries(conceptCounts).map(([concept, count]) => ({ concept, count })),
        recurringMistakes: Object.entries(errorCounts).map(([errorType, count]) => ({ errorType, count })),
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
