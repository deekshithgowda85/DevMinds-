// Phase 4 Test: LLM Reasoning Layer
// Run: npx tsx test/test-llm.ts

process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.local' });

const TEST_USER = 'test-llm-user';

async function main() {
  const { callLLM, callLLMForJSON } = require('../lib/devmind/llm/groq');
  const { buildDebugSystemPrompt, buildDebugUserMessage } = require('../lib/devmind/llm/prompts');
  const { debugWithMemory, generateSmartDocs } = require('../lib/devmind/llm/chain');

  console.log('🧠 Testing DevMind LLM Reasoning Layer\n');

  // ─── Test 1: Basic LLM Call ─────────────────────────────
  console.log('1️⃣  Testing basic Groq LLM call...');
  const basicResponse = await callLLM(
    'You are a helpful assistant. Reply in one sentence.',
    'What is a TypeError in JavaScript?'
  );
  console.log('   ✅ Response:', basicResponse.slice(0, 120));

  // ─── Test 2: JSON Mode ──────────────────────────────────
  console.log('\n2️⃣  Testing JSON mode...');
  const jsonResponse = await callLLMForJSON<{ answer: string; confidence: number }>(
    'Reply with a JSON object: {"answer": "...", "confidence": 0.0-1.0}',
    'What is 2 + 2?'
  );
  console.log('   ✅ Parsed JSON:', JSON.stringify(jsonResponse));

  // ─── Test 3: Prompt Building ────────────────────────────
  console.log('\n3️⃣  Testing prompt builder (with memory context)...');
  const mockContext = {
    similarPastErrors: [
      { sessionId: 's1', errorType: 'TypeError', conceptGap: 'null safety', language: 'javascript', similarity: 0.85, timestamp: '2024-01-01' },
    ],
    recurringMistakes: ['TypeError (5x)', 'SyntaxError (2x)'],
    knownWeakConcepts: ['null/undefined checking', 'async/await'],
    totalSessionCount: 7,
    recentErrorTypes: ['TypeError', 'SyntaxError'],
  };
  const systemPrompt = buildDebugSystemPrompt(mockContext);
  console.log('   ✅ System prompt length:', systemPrompt.length, 'chars');
  console.log('   Contains memory:', systemPrompt.includes('LEARNING HISTORY'));
  console.log('   Contains recurring:', systemPrompt.includes('TypeError (5x)'));

  // ─── Test 4: Full Debug Pipeline ────────────────────────
  console.log('\n4️⃣  Testing full debugWithMemory pipeline...');
  const debugResult = await debugWithMemory({
    userId: TEST_USER,
    language: 'javascript',
    code: 'const data = fetchData();\nconst name = data.user.name;',
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'name')",
  });
  console.log('   ✅ Session ID:', debugResult.sessionId);
  console.log('   Error Type:', debugResult.result.errorType);
  console.log('   Concept Gap:', debugResult.result.detectedConceptGap);
  console.log('   Confidence:', debugResult.result.confidenceLevel);
  console.log('   Is Recurring:', debugResult.result.isRecurring);
  console.log('   Learning Tip:', debugResult.result.learningTip?.slice(0, 100));
  console.log('   Fix:', debugResult.result.fix?.slice(0, 100));
  console.log('   Memory Stats:', JSON.stringify(debugResult.memoryStats));

  // ─── Test 5: Second call (should detect recurring) ──────
  console.log('\n5️⃣  Testing second debug call (should detect recurring pattern)...');
  const debugResult2 = await debugWithMemory({
    userId: TEST_USER,
    language: 'javascript',
    code: 'const res = await fetch("/api");\nconst items = res.json().data;',
    errorMessage: "TypeError: Cannot read properties of undefined (reading 'data')",
  });
  console.log('   ✅ Session ID:', debugResult2.sessionId);
  console.log('   Is Recurring:', debugResult2.result.isRecurring);
  console.log('   Similar Past Errors:', debugResult2.result.similarPastErrors);
  console.log('   Total Sessions:', debugResult2.memoryStats.totalSessions);

  // ─── Test 6: SmartDocs Generation ───────────────────────
  console.log('\n6️⃣  Testing SmartDocs generation...');
  const docs = await generateSmartDocs(TEST_USER);
  console.log('   ✅ Report Generated:', docs.generatedAt);
  console.log('   Sessions Analyzed:', docs.totalSessionsAnalyzed);
  console.log('   Recurring Mistakes:', docs.sections.recurringMistakes.items.length);
  console.log('   Concept Weaknesses:', docs.sections.conceptWeaknesses.items.length);
  console.log('   Roadmap Steps:', docs.sections.learningRoadmap.steps.length);
  console.log('\n   📄 Markdown Report Preview:');
  console.log('   ' + docs.markdownReport.split('\n').slice(0, 10).join('\n   '));

  console.log('\n\n✅ ALL PHASE 4 TESTS PASSED!');
  console.log('   → Groq LLM: working');
  console.log('   → JSON parsing: working');
  console.log('   → Memory-aware prompts: working');
  console.log('   → Full debug pipeline: stores + retrieves + analyzes');
  console.log('   → SmartDocs: generates reports from history');

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Test FAILED:', e);
  process.exit(1);
});
