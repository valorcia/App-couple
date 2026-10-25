import { PrismaClient } from '@prisma/client';

export function createPrismaClient(url?: string): PrismaClient {
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.PRISMA_LOG === 'query' ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

declare global {
  // eslint-disable-next-line no-var
  var __couplePrisma: PrismaClient | undefined;
}

/** Singleton partagé (évite les connexions multiples en dev / hot reload). */
export const prisma: PrismaClient = globalThis.__couplePrisma ?? createPrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__couplePrisma = prisma;
