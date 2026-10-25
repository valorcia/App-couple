import type { ContentTier } from '@prisma/client';

export interface SeedDesire { category: string; intensity: number; text: string; tier?: ContentTier }

/**
 * Catalogue Double Secret. Intensité : 1 tendresse/romantisme, 2 séduction/complicité,
 * 3 désirs, 4 fantasmes et expériences. Les items sont volontairement sobres : la formulation
 * est factuelle et respectueuse, jamais crue.
 */
export const desireItems: SeedDesire[] = [
  { category: 'tenderness', intensity: 1, text: 'Un petit-déjeuner au lit préparé par l’autre' },
  { category: 'tenderness', intensity: 1, text: 'S’endormir en se tenant la main' },
  { category: 'tenderness', intensity: 1, text: 'Un long câlin sans téléphone, chaque soir pendant une semaine' },
  { category: 'romance', intensity: 1, text: 'Un dîner aux chandelles à la maison' },
  { category: 'romance', intensity: 1, text: 'Une lettre d’amour manuscrite' },
  { category: 'romance', intensity: 1, text: 'Danser dans le salon sur notre chanson' },
  { category: 'seduction', intensity: 2, text: 'Un rendez-vous où l’on fait semblant de se rencontrer pour la première fois' },
  { category: 'seduction', intensity: 2, text: 'Recevoir un message séduisant en pleine journée' },
  { category: 'seduction', intensity: 2, text: 'Choisir la tenue de l’autre pour une soirée' },
  { category: 'complicity', intensity: 2, text: 'Prendre un bain ou une douche ensemble' },
  { category: 'complicity', intensity: 2, text: 'Un massage complet à la bougie' },
  { category: 'complicity', intensity: 2, text: 'Une nuit dans un hôtel de notre ville', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Prendre le temps : une soirée entière consacrée à l’autre', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Se dire ce qui nous plaît le plus chez l’autre, sans détour', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Un réveil en douceur, sans alarme, sans programme', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Imaginer ensemble un scénario et le jouer', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Une surprise intime organisée entièrement par l’autre', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Découvrir ensemble quelque chose de nouveau, choisi à deux', tier: 'PREMIUM' },
];
