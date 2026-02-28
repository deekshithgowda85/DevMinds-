// Quick check: Pinecone index info
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { Pinecone } from '@pinecone-database/pinecone';

async function check() {
  const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const indexes = await pc.listIndexes();
  console.log('Pinecone Indexes:', JSON.stringify(indexes, null, 2));
}
check().catch(e => console.error('Error:', e.message));
