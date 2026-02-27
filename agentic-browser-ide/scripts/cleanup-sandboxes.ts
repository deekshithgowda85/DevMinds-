#!/usr/bin/env node

/**
 * Cleanup Script - Force close all E2B sandboxes
 * Run this when you hit the rate limit
 */

import 'dotenv/config';

async function cleanupSandboxes() {
  console.log('🧹 E2B Sandbox Cleanup Tool\n');
  
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
  
  try {
    console.log('📊 Fetching current sandbox stats...');
    
    const statsResponse = await fetch(`${baseUrl}/api/sandbox/cleanup`);
    const statsData: any = await statsResponse.json();
    
    if (statsData.success && statsData.stats) {
      console.log(`\n📦 Active Sessions: ${statsData.stats.activeSessions}`);
      
      if (statsData.stats.sessions.length > 0) {
        console.log('\nSession Details:');
        statsData.stats.sessions.forEach((s: any, i: number) => {
          const ageMin = Math.round(s.age / 1000 / 60);
          const idleMin = Math.round(s.idleTime / 1000 / 60);
          console.log(`  ${i + 1}. ID: ${s.id.substring(0, 8)}... | Age: ${ageMin}m | Idle: ${idleMin}m | Tasks: ${s.activeTasks}`);
        });
      }
    }
    
    console.log('\n🗑️  Starting forced cleanup...');
    
    const cleanupResponse = await fetch(`${baseUrl}/api/sandbox/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true }),
    });
    
    const cleanupData: any = await cleanupResponse.json();
    
    if (cleanupData.success) {
      console.log(`\n✅ Cleanup complete!`);
      console.log(`   Closed: ${cleanupData.closed} sandboxes`);
      console.log(`   Remaining: ${cleanupData.remaining} sandboxes`);
      
      if (cleanupData.errors && cleanupData.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        cleanupData.errors.forEach((err: string) => {
          console.log(`   - ${err}`);
        });
      }
      
      if (cleanupData.closed > 0) {
        console.log('\n💡 You can now create new sandboxes!');
      } else {
        console.log('\n💡 No sandboxes needed cleanup.');
      }
    } else {
      console.error('\n❌ Cleanup failed:', cleanupData.error);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    console.log('\n💡 Make sure the dev server is running: npm run dev');
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupSandboxes();
}

export { cleanupSandboxes };
