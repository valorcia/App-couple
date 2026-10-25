import type { ZodSafeParseResult } from 'zod';
export function normalizeOk<T>(r: ZodSafeParseResult<T>): T {
  if (!r.success) throw new Error(JSON.stringify(r.error.issues));
  return r.data;
}
