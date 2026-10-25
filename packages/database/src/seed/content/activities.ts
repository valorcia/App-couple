import type { BudgetLevel, Company, ContentTier, Moment, Mood } from '@prisma/client';

export interface SeedActivity {
  title: string;
  description: string;
  moods: Mood[];
  moments: Moment[];
  company: Company[];
  budget: BudgetLevel;
  durationMinutes?: number;
  indoor?: boolean;
  intimate?: boolean;
  tier?: ContentTier;
  tags?: string[];
}

export const activityIdeas: SeedActivity[] = [
  { title: 'Pique-nique improvisé', description: 'Un plaid, ce qu’il y a dans le frigo, le parc le plus proche.', moods: ['RELAX', 'ROMANTIC'], moments: ['NOW', 'WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'FREE', durationMinutes: 90, indoor: false },
  { title: 'Soirée cinéma à thème', description: 'Un film, un plat assorti, les lumières tamisées.', moods: ['RELAX', 'ROMANTIC', 'FUNNY'], moments: ['TONIGHT'], company: ['COUPLE', 'FAMILY'], budget: 'LOW', durationMinutes: 150, indoor: true },
  { title: 'Cours de cuisine à deux', description: 'Choisissez une recette que vous n’avez jamais faite et cuisinez-la ensemble.', moods: ['FOOD', 'FUNNY'], moments: ['TONIGHT', 'WEEKEND'], company: ['COUPLE'], budget: 'LOW', durationMinutes: 120, indoor: true },
  { title: 'Exposition ou musée', description: 'Une exposition temporaire près de chez vous.', moods: ['CULTURE'], moments: ['WEEKEND', 'DATE'], company: ['COUPLE', 'FAMILY'], budget: 'MEDIUM', durationMinutes: 120, indoor: true },
  { title: 'Randonnée au lever du soleil', description: 'Partir tôt, marcher, prendre le petit-déjeuner au sommet.', moods: ['ADVENTURE', 'RELAX'], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'FREE', durationMinutes: 240, indoor: false },
  { title: 'Dîner dans un restaurant jamais testé', description: 'Prenez le premier qui vous intrigue à moins de 20 minutes.', moods: ['FOOD', 'ROMANTIC'], moments: ['TONIGHT', 'DATE'], company: ['COUPLE'], budget: 'MEDIUM', durationMinutes: 120, indoor: true },
  { title: 'Blind test maison', description: 'Chacun prépare dix extraits, l’autre devine.', moods: ['FUNNY'], moments: ['NOW', 'TONIGHT'], company: ['COUPLE', 'FAMILY'], budget: 'FREE', durationMinutes: 60, indoor: true },
  { title: 'Escape game', description: 'Une heure enfermés, un objectif commun.', moods: ['ADVENTURE', 'FUNNY'], moments: ['WEEKEND', 'DATE'], company: ['COUPLE', 'FAMILY'], budget: 'MEDIUM', durationMinutes: 90, indoor: true },
  { title: 'Soirée jeux de société', description: 'Sortez une boîte oubliée ou essayez un jeu à deux.', moods: ['FUNNY', 'RELAX'], moments: ['NOW', 'TONIGHT'], company: ['COUPLE', 'FAMILY'], budget: 'FREE', durationMinutes: 90, indoor: true },
  { title: 'Balade à vélo et goûter', description: 'Une boucle tranquille, une pâtisserie à l’arrivée.', moods: ['RELAX', 'ADVENTURE'], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'LOW', durationMinutes: 150, indoor: false },
  { title: 'Concert ou spectacle', description: 'Regardez la programmation de la semaine et réservez.', moods: ['CULTURE', 'ROMANTIC'], moments: ['DATE', 'WEEKEND'], company: ['COUPLE'], budget: 'HIGH', durationMinutes: 180, indoor: true },
  { title: 'Week-end dans une ville voisine', description: 'Train tôt le samedi, retour dimanche soir.', moods: ['ADVENTURE', 'ROMANTIC', 'CULTURE'], moments: ['WEEKEND', 'DATE'], company: ['COUPLE'], budget: 'HIGH', durationMinutes: 1800, indoor: false, tier: 'PREMIUM' },
  { title: 'Soirée spa à la maison', description: 'Bougies, musique douce, masques et massage.', moods: ['ROMANTIC', 'RELAX', 'SPICY'], moments: ['TONIGHT'], company: ['COUPLE'], budget: 'LOW', durationMinutes: 120, indoor: true, intimate: true },
  { title: 'Nuit sous les étoiles', description: 'Jardin, balcon ou camping : une nuit dehors.', moods: ['ROMANTIC', 'ADVENTURE'], moments: ['WEEKEND'], company: ['COUPLE'], budget: 'FREE', durationMinutes: 600, indoor: false },
  { title: 'Atelier créatif', description: 'Poterie, peinture ou cocktail : réservez un atelier à deux.', moods: ['CULTURE', 'FUNNY'], moments: ['WEEKEND', 'DATE'], company: ['COUPLE'], budget: 'MEDIUM', durationMinutes: 150, indoor: true, tier: 'PREMIUM' },
  { title: 'Marché du matin et brunch', description: 'Faites le marché ensemble puis cuisinez ce que vous avez trouvé.', moods: ['FOOD', 'RELAX'], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'], budget: 'LOW', durationMinutes: 180, indoor: false },
];
