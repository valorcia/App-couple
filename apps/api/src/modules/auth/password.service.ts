import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';
import { AppError, ErrorCode } from '@couple/shared';

const COMMON = new Set([
  'motdepasse1', 'password123', 'azertyuiop', 'qwertyuiop', '1234567890', 'abcdefghij', 'iloveyou12',
  'motdepasse123', 'password1234', 'azerty12345', 'bonjour1234', 'soleil12345',
]);

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    return argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3, parallelism: 4 });
  }

  async verify(hash: string | null | undefined, password: string): Promise<boolean> {
    if (!hash) return false;
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  /** Règles de robustesse minimales côté serveur (en complément de la validation zod). */
  assertStrong(password: string, context: string[] = []) {
    const lower = password.toLowerCase();
    if (password.length < 10) throw weak();
    if (COMMON.has(lower)) throw weak();
    if (/^(.)\1+$/.test(password)) throw weak();
    if (/^(?:0123456789|1234567890|abcdefghij)/.test(lower)) throw weak();
    for (const c of context) {
      if (c && c.length >= 4 && lower.includes(c.toLowerCase())) throw weak();
    }
  }
}

const weak = () => new AppError(ErrorCode.AUTH_PASSWORD_WEAK, 'Choisissez un mot de passe plus robuste.', 400);
