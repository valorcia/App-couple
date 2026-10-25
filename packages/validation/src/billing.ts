import { z } from 'zod';

export const checkoutSchema = z.object({
  productCode: z.string().regex(/^[a-z0-9_-]+$/).max(40),
  /** Chemins relatifs côté web (préfixés par WEB_PUBLIC_URL côté serveur). */
  successPath: z.string().startsWith('/').max(200).default('/premium/merci'),
  cancelPath: z.string().startsWith('/').max(200).default('/premium'),
});

export const portalSchema = z.object({ returnPath: z.string().startsWith('/').max(200).default('/profil') });
