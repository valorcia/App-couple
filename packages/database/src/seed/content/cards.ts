import type { ContentTier } from '@prisma/client';

export interface SeedCard { level: number; role: 'DRAWER' | 'PARTNER' | 'BOTH'; text: string; durationSec?: number; tier?: ContentTier; tags?: string[] }

/**
 * « Les cartes du soir » : celui qui tire la carte réalise le geste pour l'autre (DRAWER), ou inversement
 * (PARTNER), ou à deux (BOTH). Niveaux : 1 douceur, 2 complicité, 3 désir, 4 feu (explicite, réservé aux
 * couples qui ont tous deux accepté ce niveau). Ton direct, jamais humiliant : tout se refuse d'un geste.
 */
const L = (level: number, role: SeedCard['role'], items: (string | [string, number])[], tier: ContentTier = 'PREMIUM'): SeedCard[] =>
  items.map((it) => (typeof it === 'string' ? { level, role, text: it, tier } : { level, role, text: it[0], durationSec: it[1], tier }));

export const intimacyCards: SeedCard[] = [
  // ---- 1 · Douceur (gratuit)
  ...L(1, 'DRAWER', [
    ['Embrasse-moi dans le cou, une minute, sans un mot.', 60],
    'Dis-moi trois choses que tu aimes dans mon corps, en les touchant.',
    ['Masse-moi les mains, lentement, les yeux dans les yeux.', 120],
    'Décris-moi la première fois où tu as eu envie de moi.',
    ['Prends-moi dans tes bras, debout, sans bouger, jusqu’à ce que nos respirations se calent.', 90],
    'Embrasse-moi comme la première fois.',
  ], 'FREE'),
  ...L(1, 'BOTH', [['Front contre front, yeux fermés, une minute de silence.', 60], 'Dites-vous chacun ce qui vous a fait fondre chez l’autre cette semaine.'], 'FREE'),

  // ---- 2 · Complicité (sensuel)
  ...L(2, 'DRAWER', [
    'Enlève-moi un vêtement, le plus lentement possible.',
    ['Embrasse-moi partout sauf sur la bouche.', 120],
    'Murmure-moi à l’oreille ce que tu as envie de me faire ce soir.',
    ['Caresse-moi le dos, du bout des doigts, sous le tissu.', 120],
    'Choisis la tenue (ou l’absence de tenue) dans laquelle tu veux me voir dans cinq minutes.',
    'Embrasse-moi l’intérieur du poignet, puis remonte, lentement, jusqu’où tu veux.',
  ]),
  ...L(2, 'PARTNER', ['Je ferme les yeux. Fais-moi deviner avec quoi tu me touches : une plume, tes lèvres, ta langue.', ['Danse pour moi sur une chanson, sans que je puisse te toucher.', 180]]),
  ...L(2, 'BOTH', [['Déshabillez-vous mutuellement, un vêtement chacun à tour de rôle, sans se presser.', 240]]),

  // ---- 3 · Désir (explicite)
  ...L(3, 'DRAWER', [
    'Caresse-moi par-dessus mes vêtements jusqu’à ce que je te demande de les enlever.',
    'Guide ma main là où tu veux la sentir, et montre-moi le rythme.',
    ['Embrasse l’intérieur de mes cuisses en remontant très lentement, sans aller au bout avant la fin du temps.', 60],
    ['Nus, peau contre peau, trente secondes sans bouger. Ensuite, fais ce que tu veux.', 30],
    'Mords-moi doucement là où tu sais que j’aime, puis embrasse.',
    'Dis-moi exactement où et comment tu veux que je te touche. Je ne fais que ça, rien d’autre, pendant deux minutes.',
    ['Allonge-toi. Ma bouche et mes mains, partout sauf là où tu les attends, pendant deux minutes.', 120],
  ]),
  ...L(3, 'PARTNER', ['Je ne bouge pas. Tu as deux minutes pour me faire perdre mon calme avec tes mains seulement.', 'Enlève ce que tu veux de ce que je porte, et dis-moi pourquoi.']),

  // ---- 4 · Feu (très explicite, consenti des deux côtés)
  ...L(4, 'DRAWER', [
    ['À genoux, les yeux dans les miens : une minute de bouche, sans te presser.', 60],
    'Allonge-toi. Je te fais jouir avec ma bouche, et tu n’as pas le droit de me toucher.',
    'Fais-moi jouir avec tes mains seulement, en me regardant.',
    ['Bande-moi les yeux et utilise ta bouche là où tu veux.', 120],
    ['Attache mes mains avec un foulard et fais ce que tu veux de moi.', 300],
    'Mets-toi sur moi et donne le rythme, lentement, jusqu’à ce que je te supplie d’accélérer.',
    'Lèche-moi, doucement puis plus vite, jusqu’à ce que je dise stop. Pas avant.',
    'Choisis une position qu’on n’a pas faite depuis longtemps et prends les commandes.',
    'Dis-moi, crûment, ce que tu veux que je te fasse. Puis je le fais.',
    'Dos à moi, penche-toi, et laisse-moi faire.',
    ['Caresse-toi devant moi, sans que je puisse te toucher, jusqu’à ce que je craque.', 180],
    'Choisis : ma bouche ou mes mains. Je te fais jouir avec, sans rien d’autre.',
    'Pose-moi contre le mur et prends-moi là, tout de suite.',
    ['Ta bouche sur moi pendant que je te dis, à voix haute, tout ce que ça me fait.', 120],
  ]),
  ...L(4, 'PARTNER', ['Je m’allonge et je te laisse tout décider : où, comment, combien de temps.', 'Tu me guides avec tes mains sur ma tête. Je te suis, au rythme que tu veux.']),
  ...L(4, 'BOTH', ['Face à face, chacun se caresse en regardant l’autre, sans se toucher, jusqu’à ce que l’un des deux cède.', ['Quatre minutes de préliminaires chrono. Pas une seconde de plus avant de conclure.', 240]]),
];
