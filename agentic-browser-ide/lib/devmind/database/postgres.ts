// ─── DevMind PostgreSQL Client (Prisma + Neon Adapter) ──────
// Uses singleton pattern to prevent multiple Prisma instances in dev mode.
// Prisma v7 requires a driver adapter — we use @prisma/adapter-neon for Neon.

import { PrismaClient } from '../../generated/prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set in environment variables');
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter }) as unknown as PrismaClient;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
