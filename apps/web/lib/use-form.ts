'use client';
import * as React from 'react';
import type { ZodType } from 'zod';

/** Petit gestionnaire de formulaire : état, validation zod à la soumission, erreurs par champ. */
export function useZodForm<T extends Record<string, unknown>>(schema: ZodType<T>, initial: Partial<T>) {
  const [values, setValues] = React.useState<Partial<T>>(initial);
  const [errors, setErrors] = React.useState<Partial<Record<keyof T, string>>>({});
  const set = <K extends keyof T>(key: K, value: T[K]) => setValues((v) => ({ ...v, [key]: value }));
  const validate = (): T | null => {
    const r = schema.safeParse(values);
    if (r.success) {
      setErrors({});
      return r.data;
    }
    const next: Partial<Record<keyof T, string>> = {};
    for (const issue of r.error.issues) {
      const k = issue.path[0] as keyof T | undefined;
      if (k && !next[k]) next[k] = issue.message;
    }
    setErrors(next);
    return null;
  };
  return { values, errors, set, validate, setErrors };
}
