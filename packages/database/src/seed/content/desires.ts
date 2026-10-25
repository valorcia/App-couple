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
  // ---- Niveau « Désir » (3) et « Feu » (4) : explicite, direct, jamais vulgaire. Réservé Premium, visible seulement
  // si les deux partenaires ont accepté la catégorie et l'intensité, révélé uniquement si « Oui » des deux.
  { category: 'desires', intensity: 3, text: 'Se déshabiller mutuellement, très lentement, sans se presser', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Faire l’amour ailleurs que dans la chambre', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Un massage érotique à l’huile chaude, de la nuque aux pieds, sans zone interdite', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Se murmurer à l’oreille ce qu’on a envie de se faire… puis le faire', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Une douche à deux dont on ne sort pas tout de suite', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Une matinée entière au lit, peau contre peau, portes closes', tier: 'PREMIUM' },
  { category: 'desires', intensity: 3, text: 'Que l’autre prenne les commandes du début à la fin', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Jouer deux inconnus qui se séduisent dans un bar… et finir la nuit ensemble', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Les yeux bandés : l’un guide, l’autre se laisse faire', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Choisir un sextoy ensemble et le découvrir ensemble', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Mains attachées avec un foulard, l’autre décide de tout', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Un jeu de rôle assumé toute une soirée (voisin·e, inconnu·e, patron·ne…)', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Une tenue ou de la lingerie choisie par l’autre, portée rien que pour lui ou elle', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Se dire des choses crues pendant l’amour, sans retenue', tier: 'PREMIUM' },
  { category: 'fantasies', intensity: 4, text: 'Se regarder dans un miroir pendant l’amour', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Une nuit d’hôtel avec jacuzzi privatif, sans rien prévoir d’autre', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Faire l’amour en pleine nature, à l’abri des regards', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Une soirée entière consacrée au plaisir de l’un, sans réciprocité attendue', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Un week-end entier sans vêtements à la maison', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Tester un jeu coquin à dés ou à cartes, règles comprises', tier: 'PREMIUM' },
  { category: 'experiences', intensity: 4, text: 'Explorer un fantasme que l’un de nous n’a jamais osé dire', tier: 'PREMIUM' },
];
