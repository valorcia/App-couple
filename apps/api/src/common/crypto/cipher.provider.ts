import { FieldCipher } from '@couple/shared';
import { ENV, type Env } from '@/config/env';

export const FIELD_CIPHER = Symbol('FIELD_CIPHER');
export const fieldCipherProvider = {
  provide: FIELD_CIPHER,
  inject: [ENV],
  useFactory: (env: Env) => new FieldCipher(env.DATA_ENCRYPTION_KEY),
};
