#!/usr/bin/env node

/**
 * E2B Direct Cleanup - Close ALL sandboxes via E2B API
 * Use this when you have orphaned sandboxes not tracked by SandboxManager
 */

import 'dotenv/config';
// Note: Direct E2B API access, not using SDK

async function listAndCloseAllSandboxes() {
  console.log('🧹 E2B Direct Sandbox Cleanup\n');
  console.log('⚠️  This will close ALL sandboxes created with your API key\n');

  const apiKey = process.env.E2B_API_KEY;
  
  if (!apiKey) {
    console.error('❌ E2B_API_KEY not found in .env file');
    process.exit(1);
  }

  try {
    console.log('📡 Fetching all sandboxes...');
    
    // Unfortunately, E2B doesn't expose a list API method directly
    // We need to use the undocumented API
    const response = await fetch('https://api.e2b.dev/sandboxes', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    const sandboxes = data.sandboxes || [];

    console.log(`📦 Found ${sandboxes.length} active sandboxes\n`);

    if (sandboxes.length === 0) {
      console.log('✅ No sandboxes to cleanup!');
      return;
    }

    console.log('Sandbox List:');
    sandboxes.forEach((sb: any, i: number) => {
      const created = new Date(sb.createdAt).toLocaleString();
      console.log(`  ${i + 1}. ${sb.sandboxId} | Template: ${sb.templateId} | Created: ${created}`);
    });

    console.log('\n🗑️  Closing all sandboxes...\n');

    let closed = 0;
    let failed = 0;

    for (const sb of sandboxes) {
      try {
        // Use E2B API to kill sandbox
        const killResponse = await fetch(`https://api.e2b.dev/sandboxes/${sb.sandboxId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });

        if (killResponse.ok) {
          console.log(`  ✅ Closed: ${sb.sandboxId}`);
          closed++;
        } else {
          console.error(`  ❌ Failed to close ${sb.sandboxId}: ${killResponse.status}`);
          failed++;
        }
      } catch (error) {
        console.error(`  ❌ Error closing ${sb.sandboxId}:`, error);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total: ${sandboxes.length}`);
    console.log(`   Closed: ${closed}`);
    console.log(`   Failed: ${failed}`);

    if (closed > 0) {
      console.log('\n✅ Cleanup complete! You can now create new sandboxes.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  listAndCloseAllSandboxes();
}

export { listAndCloseAllSandboxes };
