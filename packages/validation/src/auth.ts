import { z } from 'zod';
import { emailSchema, localeSchema, passwordSchema, timezoneSchema } from './common';

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(1).max(40),
  locale: localeSchema.default('fr'),
  timezone: timezoneSchema.default('Europe/Paris'),
  acceptTerms: z.literal(true, { error: 'Vous devez accepter les conditions.' }),
  termsVersion: z.string().default('2026-01'),
  marketingOptIn: z.boolean().default(false),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(256).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(20).max(256).optional(),
  everywhere: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(256),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(20).max(256) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
});

export const confirmAdultSchema = z.object({
  confirm: z.literal(true),
});
