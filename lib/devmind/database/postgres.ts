// ─── DevMind PostgreSQL Client (Prisma + Neon Adapter) ──────
// Uses singleton pattern to prevent multiple Prisma instances in dev mode.
// Prisma v7 requires a driver adapter — we use @prisma/adapter-neon for Neon.

import { PrismaClient } from '@/lib/generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Check if DATABASE_URL is configured with a real value.
 */
export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL;
  return !!url && url !== 'postgresql://user:password@host:5432/devmind' && !url.includes('your-');
}

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

// Lazy singleton — only connects when actually used
function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

// Use a Proxy so importing `prisma` never throws at module load time,
// but accessing any property on it will trigger the lazy connection.
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export default prisma;
