import type { GameType } from '@prisma/client';

export const categories: { code: string; name: string; description: string; icon: string; gameTypes: GameType[]; sortOrder: number }[] = [
  { code: 'love', name: 'Amour', description: 'Ce qui vous lie, ce qui vous touche.', icon: 'sparkles', gameTypes: ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'CONFESSIONS'], sortOrder: 1 },
  { code: 'humor', name: 'Humour', description: 'Pour rire de vous, ensemble.', icon: 'laugh', gameTypes: ['SECRET_ANSWERS', 'WHICH_OF_US', 'DILEMMA'], sortOrder: 2 },
  { code: 'daily', name: 'Quotidien', description: 'Les petites choses de tous les jours.', icon: 'coffee', gameTypes: ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'WHICH_OF_US'], sortOrder: 3 },
  { code: 'money', name: 'Argent', description: 'Parler d’argent sans tabou.', icon: 'piggy-bank', gameTypes: ['SECRET_ANSWERS', 'DILEMMA'], sortOrder: 4 },
  { code: 'travel', name: 'Vacances', description: 'Envies d’ailleurs.', icon: 'plane', gameTypes: ['SECRET_ANSWERS', 'DILEMMA', 'WHO_KNOWS_BEST'], sortOrder: 5 },
  { code: 'family', name: 'Famille', description: 'Les vôtres, la vôtre.', icon: 'home', gameTypes: ['SECRET_ANSWERS', 'CONFESSIONS'], sortOrder: 6 },
  { code: 'personality', name: 'Personnalité', description: 'Qui êtes-vous vraiment ?', icon: 'fingerprint', gameTypes: ['WHO_KNOWS_BEST', 'WHICH_OF_US'], sortOrder: 7 },
  { code: 'memories', name: 'Souvenirs', description: 'Votre histoire.', icon: 'camera', gameTypes: ['SECRET_ANSWERS', 'MEMORY_QUIZ'], sortOrder: 8 },
  { code: 'future', name: 'Avenir', description: 'Ce que vous construisez.', icon: 'compass', gameTypes: ['SECRET_ANSWERS', 'DILEMMA', 'CONFESSIONS'], sortOrder: 9 },
  { code: 'intimacy', name: 'Intimité', description: 'Réservé à l’espace Intimité (opt-in).', icon: 'lock', gameTypes: ['SECRET_ANSWERS', 'CONFESSIONS', 'CHALLENGE'], sortOrder: 10 },
];
