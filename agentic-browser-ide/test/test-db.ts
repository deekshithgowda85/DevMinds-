// Quick test: Insert data into Neon PostgreSQL and verify connection
// Run: npx tsx test/test-db.ts

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

async function main() {
  console.log('🔌 Connecting to Neon PostgreSQL...');
  
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaClient;

  // 1. Create a test user
  console.log('\n📝 Creating test user...');
  const user = await prisma.user.create({
    data: {
      email: `test-${Date.now()}@devmind.dev`,
      name: 'Test User',
    },
  });
  console.log('✅ User created:', user.id, user.email);

  // 2. Create a test debug session
  console.log('\n📝 Creating test debug session...');
  const session = await prisma.debugSession.create({
    data: {
      userId: user.id,
      language: 'javascript',
      codeSnippet: 'const x = undefined;\nx.toString();',
      errorMessage: 'TypeError: Cannot read properties of undefined',
      errorType: 'TypeError',
      conceptGap: 'null/undefined checking',
      explanation: 'Variable x is undefined, calling toString() on it throws.',
      fix: 'if (x != null) { x.toString(); }',
      confidenceLevel: 0.85,
    },
  });
  console.log('✅ Debug session created:', session.id);

  // 3. Read back everything
  console.log('\n📖 Reading back all data...');
  const allUsers = await prisma.user.findMany({
    include: { debugSessions: true, learningMetrics: true },
  });
  
  for (const u of allUsers) {
    console.log(`  👤 ${u.name} (${u.email})`);
    console.log(`     Sessions: ${u.debugSessions.length}`);
    for (const s of u.debugSessions) {
      console.log(`       - [${s.language}] ${s.errorType}: ${s.errorMessage.slice(0, 50)}`);
      console.log(`         Confidence: ${s.confidenceLevel}, Gap: ${s.conceptGap}`);
    }
  }

  // 4. Count totals
  const userCount = await prisma.user.count();
  const sessionCount = await prisma.debugSession.count();
  console.log(`\n📊 Total in DB: ${userCount} users, ${sessionCount} debug sessions`);

  await prisma.$disconnect();
  console.log('\n✅ Database connection test PASSED! Check your Neon dashboard at https://console.neon.tech');
}

main().catch((e) => {
  console.error('❌ Test FAILED:', e.message);
  process.exit(1);
});
