// Phase 3 Test: Full memory pipeline — store + retrieve
// Run: npx tsx test/test-memory.ts

// Load env BEFORE any other imports
process.env.NODE_ENV = 'test';
require('dotenv').config({ path: '.env.local' });

const TEST_USER = 'test-memory-user';

async function main() {
  // Dynamic imports so DATABASE_URL is available first
  const { storeDebugMemory } = require('../lib/devmind/memory/storage');
  const { retrieveMemoryContext } = require('../lib/devmind/memory/retrieval');
  console.log('🧠 Testing DevMind Memory Pipeline\n');

  // ─── Step 1: Store 3 debug sessions ──────────────────────
  console.log('📝 Storing debug session 1 (TypeError)...');
  const id1 = await storeDebugMemory({
    userId: TEST_USER,
    language: 'javascript',
    codeSnippet: 'const x = undefined;\nx.toString();',
    errorMessage: 'TypeError: Cannot read properties of undefined (reading toString)',
    errorType: 'TypeError',
    conceptGap: 'null/undefined checking',
    explanation: 'x is undefined, you need to check before calling methods on it.',
    fix: 'if (x != null) { x.toString(); }',
    confidenceLevel: 0.85,
  });
  console.log('   ✅ Session stored:', id1);

  console.log('📝 Storing debug session 2 (similar TypeError)...');
  const id2 = await storeDebugMemory({
    userId: TEST_USER,
    language: 'javascript',
    codeSnippet: 'const obj = null;\nconsole.log(obj.name);',
    errorMessage: 'TypeError: Cannot read properties of null (reading name)',
    errorType: 'TypeError',
    conceptGap: 'null/undefined checking',
    explanation: 'obj is null, accessing .name on null throws.',
    fix: 'console.log(obj?.name ?? "default");',
    confidenceLevel: 0.80,
  });
  console.log('   ✅ Session stored:', id2);

  console.log('📝 Storing debug session 3 (ReferenceError)...');
  const id3 = await storeDebugMemory({
    userId: TEST_USER,
    language: 'python',
    codeSnippet: 'print(my_var)',
    errorMessage: "NameError: name 'my_var' is not defined",
    errorType: 'ReferenceError',
    conceptGap: 'variable scope',
    explanation: 'my_var is not declared in the current scope.',
    fix: 'my_var = "value"\nprint(my_var)',
    confidenceLevel: 0.90,
  });
  console.log('   ✅ Session stored:', id3);

  // ─── Step 2: Retrieve memory context ─────────────────────
  console.log('\n🔍 Retrieving memory context for a NEW similar TypeError...');
  const context = await retrieveMemoryContext(
    TEST_USER,
    'javascript',
    'const data = fetchData();\ndata.map(item => item.id);',
    'TypeError: Cannot read properties of undefined (reading map)'
  );

  console.log('\n📊 Memory Context Results:');
  console.log('   Total Sessions:', context.totalSessionCount);
  console.log('   Similar Past Errors:', context.similarPastErrors.length);
  for (const err of context.similarPastErrors) {
    console.log(`     - [${err.errorType}] gap: ${err.conceptGap}, similarity: ${(err.similarity * 100).toFixed(1)}%`);
  }
  console.log('   Recurring Mistakes:', context.recurringMistakes);
  console.log('   Known Weak Concepts:', context.knownWeakConcepts);
  console.log('   Recent Error Types:', context.recentErrorTypes);

  console.log('\n✅ Memory pipeline test PASSED!');
  console.log('   → PostgreSQL: check Neon dashboard for debug_sessions + learning_metrics');
  console.log('   → Pinecone: check dashboard for vectors in devmind-memory index');
  
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Test FAILED:', e);
  process.exit(1);
});
