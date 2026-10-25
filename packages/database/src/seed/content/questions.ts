import type { ContentTier, GameType } from '@prisma/client';

export interface SeedQuestion {
  gameType: GameType;
  category: string;
  text: string;
  level?: number;
  tier?: ContentTier;
  payload?: Record<string, unknown>;
  tags?: string[];
}

const secret = (category: string, texts: string[], tier: ContentTier = 'FREE', level = 1): SeedQuestion[] =>
  texts.map((text) => ({ gameType: 'SECRET_ANSWERS', category, text, tier, level }));
const whoKnows = (category: string, texts: string[], tier: ContentTier = 'FREE'): SeedQuestion[] =>
  texts.map((text) => ({ gameType: 'WHO_KNOWS_BEST', category, text, tier }));
const dilemma = (category: string, items: [string, string, string][], tier: ContentTier = 'FREE'): SeedQuestion[] =>
  items.map(([text, a, b]) => ({ gameType: 'DILEMMA', category, text, tier, payload: { options: [a, b] } }));
const whichOfUs = (category: string, texts: string[], tier: ContentTier = 'FREE'): SeedQuestion[] =>
  texts.map((text) => ({ gameType: 'WHICH_OF_US', category, text, tier }));
const confession = (category: string, level: number, texts: string[], tier: ContentTier = 'FREE'): SeedQuestion[] =>
  texts.map((text) => ({ gameType: 'CONFESSIONS', category, text, level, tier }));

export const questions: SeedQuestion[] = [
  // ---------------- Réponses secrètes
  ...secret('love', [
    'Quel est le moment de notre histoire que tu rejouerais volontiers ?',
    'Qu’est-ce qui t’a fait penser « c’est la bonne personne » ?',
    'Quelle petite attention de ma part te touche le plus ?',
    'Si tu devais me décrire en trois mots à quelqu’un qui ne me connaît pas ?',
    'Quel est le compliment que tu aimerais entendre plus souvent ?',
  ]),
  ...secret('humor', [
    'Quelle est la chose la plus ridicule que nous ayons faite ensemble ?',
    'Quel surnom secret me donnerais-tu si tu devais en inventer un ce soir ?',
    'Si notre couple était une série télé, quel en serait le titre ?',
    'Quelle habitude de l’autre te fait sourire (ou lever les yeux au ciel) ?',
  ]),
  ...secret('daily', [
    'Quel moment de la journée préfères-tu passer avec moi ?',
    'Quelle corvée accepterais-tu de reprendre si je te la proposais gentiment ?',
    'Quel rituel aimerais-tu qu’on instaure dans notre semaine ?',
    'Qu’est-ce qui rendrait nos matins plus doux ?',
  ]),
  ...secret('money', [
    'Si nous gagnions 10 000 € demain, que ferais-tu en premier ?',
    'Quelle dépense te semble toujours justifiée, même quand le budget est serré ?',
    'De quoi aimerais-tu qu’on parle plus ouvertement côté argent ?',
  ]),
  ...secret('travel', [
    'Quelle destination rêves-tu de découvrir avec moi ?',
    'Vacances idéales : hamac ou randonnée ?',
    'Quel voyage passé referais-tu à l’identique ?',
  ]),
  ...secret('family', [
    'Quelle tradition de ta famille aimerais-tu garder dans la nôtre ?',
    'Qu’as-tu appris de tes parents que tu veux (ou ne veux pas) reproduire ?',
  ]),
  ...secret('memories', [
    'Quel est ton premier souvenir précis de nous deux ?',
    'Quel cadeau que je t’ai offert t’a le plus marqué ?',
    'Quelle photo de nous aimes-tu le plus, et pourquoi ?',
  ]),
  ...secret('future', [
    'Où nous vois-tu dans cinq ans ?',
    'Quel projet commun te fait le plus envie en ce moment ?',
    'Qu’aimerais-tu qu’on ose faire cette année ?',
  ]),
  ...secret('love', [
    'Qu’est-ce que tu n’as jamais osé me demander ?',
    'À quel moment t’es-tu senti·e le plus proche de moi ?',
    'Qu’est-ce qui, chez moi, te rassure quand tout va mal ?',
  ], 'PREMIUM', 2),
  // ---------------- Qui connaît le mieux l'autre ? (l'un répond sur lui-même, l'autre devine)
  ...whoKnows('personality', [
    'Quel est mon plat réconfort ?',
    'Si je pouvais avoir un super-pouvoir, lequel choisirais-je ?',
    'Quelle est ma plus grande peur (petite ou grande) ?',
    'Quel film pourrais-je revoir cent fois ?',
    'Quelle est la chose que je remets toujours au lendemain ?',
    'Quel est mon moment préféré de la journée ?',
  ]),
  ...whoKnows('daily', [
    'Que commande-je presque toujours au restaurant ?',
    'Quel est mon petit plaisir coupable ?',
    'Quelle application ai-je ouverte en dernier ?',
  ]),
  ...whoKnows('travel', ['Quelle serait ma destination de rêve si l’argent n’était pas un sujet ?', 'Plutôt plage, montagne ou ville ?']),
  ...whoKnows('love', ['Quel geste de ta part me fait fondre à coup sûr ?', 'Quelle chanson me fait penser à nous ?'], 'PREMIUM'),
  // ---------------- Dilemmes
  ...dilemma('future', [
    ['Partir un an autour du monde ou acheter la maison de vos rêves ?', 'Un an autour du monde', 'La maison de nos rêves'],
    ['Vivre à la campagne sans voisins ou en centre-ville sans voiture ?', 'La campagne', 'Le centre-ville'],
    ['Travailler moins et gagner moins, ou l’inverse ?', 'Moins travailler', 'Gagner plus'],
  ]),
  ...dilemma('humor', [
    ['Ne plus jamais manger de fromage ou ne plus jamais manger de chocolat ?', 'Adieu le fromage', 'Adieu le chocolat'],
    ['Savoir chanter parfaitement ou danser parfaitement ?', 'Chanter', 'Danser'],
    ['Un week-end sans téléphone ou un mois sans dessert ?', 'Sans téléphone', 'Sans dessert'],
  ]),
  ...dilemma('travel', [
    ['Trois courts séjours en Europe ou un long voyage lointain ?', 'Trois courts séjours', 'Un long voyage'],
    ['Hôtel tout confort ou cabane au bout du monde ?', 'Tout confort', 'Cabane'],
  ]),
  ...dilemma('money', [
    ['Dépenser pour une expérience inoubliable ou économiser pour un projet ?', 'L’expérience', 'Le projet'],
  ]),
  // ---------------- Lequel de nous deux ?
  ...whichOfUs('humor', [
    'Lequel de nous deux survivrait le mieux sur une île déserte ?',
    'Lequel de nous deux est le plus mauvais perdant ?',
    'Lequel de nous deux chante le plus faux sous la douche ?',
    'Lequel de nous deux s’endort en premier devant un film ?',
    'Lequel de nous deux est le plus doué pour trouver une excuse ?',
  ]),
  ...whichOfUs('daily', [
    'Lequel de nous deux est le plus organisé ?',
    'Lequel de nous deux cuisine le mieux ?',
    'Lequel de nous deux oublie le plus souvent ses clés ?',
    'Lequel de nous deux dit le plus souvent « on verra » ?',
  ]),
  ...whichOfUs('personality', [
    'Lequel de nous deux est le plus romantique ?',
    'Lequel de nous deux est le plus aventurier ?',
    'Lequel de nous deux est le plus têtu ?',
  ]),
  // ---------------- Confessions (niveaux 1 léger → 4 très intime)
  ...confession('love', 1, ['Quelle est la première chose que tu as remarquée chez moi ?', 'Quel est ton souvenir le plus drôle de nos débuts ?']),
  ...confession('love', 2, ['Y a-t-il quelque chose que tu aimerais que je fasse plus souvent ?', 'Quand te sens-tu le plus aimé·e ?']),
  ...confession('future', 3, ['Quelle peur as-tu pour nous que tu n’as jamais dite ?', 'Qu’est-ce que tu aimerais que je comprenne mieux de toi ?'], 'PREMIUM'),
  ...confession('intimacy', 4, ['Qu’est-ce qui te fait te sentir désiré·e ?', 'Y a-t-il un moment intime que tu aimerais revivre ?'], 'PREMIUM'),
];
