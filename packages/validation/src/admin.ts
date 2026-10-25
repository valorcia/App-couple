import { z } from 'zod';
import { paginationSchema } from './common';

export const adminUserSearchSchema = paginationSchema.extend({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'PENDING_DELETION', 'DELETED']).optional(),
});

export const adminSuspendUserSchema = z.object({
  reason: z.string().trim().min(5).max(500),
});

export const upsertFeatureFlagSchema = z.object({
  key: z.string().regex(/^[a-z0-9_.-]+$/i).max(64),
  description: z.string().max(300).optional(),
  enabled: z.boolean(),
  rules: z.record(z.string(), z.unknown()).default({}),
});

export const upsertAppSettingSchema = z.object({
  key: z.string().max(80),
  value: z.unknown(),
  description: z.string().max(300).optional(),
});

export const upsertProductSchema = z.object({
  code: z.string().regex(/^[a-z0-9_-]+$/).max(40),
  type: z.enum(['SUBSCRIPTION', 'PACK']),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).default('EUR'),
  interval: z.enum(['MONTH', 'YEAR']).nullable().optional(),
  entitlementKey: z.string().min(1).max(60),
  stripePriceId: z.string().max(100).nullable().optional(),
  appleProductId: z.string().max(100).nullable().optional(),
  googleProductId: z.string().max(100).nullable().optional(),
  active: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});
