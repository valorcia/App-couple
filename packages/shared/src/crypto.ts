import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto';
import { INVITATION_CODE_ALPHABET, INVITATION_CODE_LENGTH } from './constants';

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

/** Jeton opaque URL-safe (par défaut 32 octets → 43 caractères). */
export const randomToken = (bytes = 32): string => randomBytes(bytes).toString('base64url');

/** Code d'invitation lisible (alphabet sans caractères ambigus). */
export function invitationCode(length = INVITATION_CODE_LENGTH): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += INVITATION_CODE_ALPHABET[randomInt(INVITATION_CODE_ALPHABET.length)];
  }
  return out;
}

export const normalizeInvitationCode = (raw: string): string =>
  raw.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/O/g, '0').replace(/I/g, '1');

/**
 * Chiffrement applicatif AES-256-GCM. Format: v1.<keyId>.<iv>.<tag>.<ciphertext> (base64url).
 */
export class FieldCipher {
  private readonly key: Buffer;
  constructor(base64Key: string, private readonly keyId = '1') {
    this.key = Buffer.from(base64Key, 'base64');
    if (this.key.length !== 32) {
      throw new Error('DATA_ENCRYPTION_KEY doit faire 32 octets encodés en base64');
    }
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return ['v1', this.keyId, iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
  }

  decrypt(payload: string): string {
    const [version, _keyId, ivB64, tagB64, dataB64] = payload.split('.');
    if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Format chiffré invalide');
    const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivB64, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64url')), decipher.final()]).toString('utf8');
  }

  encryptJson(value: unknown): string {
    return this.encrypt(JSON.stringify(value));
  }
  decryptJson<T = unknown>(payload: string): T {
    return JSON.parse(this.decrypt(payload)) as T;
  }
}
