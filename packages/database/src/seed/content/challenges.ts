import type { BudgetLevel, ChallengeDifficulty, ContentTier } from '@prisma/client';

export interface SeedChallenge {
  category: string;
  title: string;
  description: string;
  instructions: string[];
  durationMinutes?: number;
  difficulty: ChallengeDifficulty;
  budget: BudgetLevel;
  materials?: string[];
  intimate?: boolean;
  tier?: ContentTier;
  tags?: string[];
}

export const challenges: SeedChallenge[] = [
  { category: 'love', title: 'Le mot caché', description: 'Glissez chacun un mot doux là où l’autre le trouvera dans la journée.', instructions: ['Écrivez un mot à la main.', 'Cachez-le dans un endroit que l’autre utilisera aujourd’hui.', 'Ne dites rien, attendez la réaction.'], durationMinutes: 10, difficulty: 'EASY', budget: 'FREE', materials: ['papier', 'stylo'], tags: ['tendresse'] },
  { category: 'humor', title: 'Le dîner à l’aveugle', description: 'L’un cuisine, l’autre devine les ingrédients les yeux bandés.', instructions: ['Préparez trois bouchées surprises.', 'Bandez les yeux de votre partenaire.', 'Un point par ingrédient deviné.'], durationMinutes: 45, difficulty: 'MEDIUM', budget: 'LOW', materials: ['foulard'], tags: ['cuisine', 'rire'] },
  { category: 'daily', title: 'Échange de rôles', description: 'Pendant une soirée, chacun prend les habitudes de l’autre.', instructions: ['Listez trois habitudes typiques de chacun.', 'Échangez-les pour la soirée.', 'Débriefez : qu’avez-vous découvert ?'], durationMinutes: 180, difficulty: 'MEDIUM', budget: 'FREE', tags: ['quotidien'] },
  { category: 'travel', title: 'Voyage sans partir', description: 'Choisissez un pays au hasard et vivez une soirée à ses couleurs.', instructions: ['Tirez un pays au sort.', 'Un plat, une musique, un mot appris.', 'Prenez une photo souvenir.'], durationMinutes: 120, difficulty: 'MEDIUM', budget: 'LOW', tags: ['aventure', 'cuisine'] },
  { category: 'love', title: 'La lettre à ouvrir plus tard', description: 'Écrivez-vous une lettre à lire dans un an, à la même date.', instructions: ['Écrivez sans vous relire.', 'Scellez l’enveloppe.', 'Ajoutez la date d’ouverture à votre agenda partagé.'], durationMinutes: 30, difficulty: 'EASY', budget: 'FREE', materials: ['enveloppes'], tags: ['souvenirs'] },
  { category: 'daily', title: 'Marche sans destination', description: 'Partez marcher 30 minutes : à chaque carrefour, l’un de vous choisit la direction.', instructions: ['Téléphones en poche.', 'Alternez le choix à chaque intersection.', 'Terminez par un café ou un banc.'], durationMinutes: 40, difficulty: 'EASY', budget: 'FREE', tags: ['plein air'] },
  { category: 'humor', title: 'Le karaoké de salon', description: 'Chacun choisit une chanson que l’autre devra interpréter avec conviction.', instructions: ['Choisissez une chanson pour l’autre.', 'Interprétation complète obligatoire.', 'Applaudissements obligatoires aussi.'], durationMinutes: 30, difficulty: 'EASY', budget: 'FREE', tags: ['rire', 'musique'] },
  { category: 'future', title: 'La carte de nos envies', description: 'Dessinez ensemble une carte (vraie ou imaginaire) des endroits où vous voulez aller et des projets que vous voulez vivre.', instructions: ['Grande feuille ou tableau.', 'Chacun place cinq envies.', 'Entourez celles que vous partagez.'], durationMinutes: 60, difficulty: 'MEDIUM', budget: 'FREE', materials: ['papier', 'feutres'], tier: 'PREMIUM', tags: ['projets'] },
  { category: 'love', title: 'Le massage de cinq minutes', description: 'Cinq minutes chacun, sans parler, pour relâcher la journée.', instructions: ['Minuteur réglé sur cinq minutes.', 'Épaules, nuque, mains.', 'Échangez les rôles.'], durationMinutes: 15, difficulty: 'EASY', budget: 'FREE', tags: ['tendresse', 'détente'] },
  { category: 'intimacy', title: 'Le jeu des trois souhaits', description: 'Chacun formule trois souhaits intimes ; l’autre en choisit un à réaliser ce soir ou plus tard.', instructions: ['Écrivez trois souhaits sur trois papiers.', 'L’autre en tire un sans le lire aux autres.', 'Choisissez ensemble le moment.'], durationMinutes: 60, difficulty: 'MEDIUM', budget: 'FREE', intimate: true, tier: 'PREMIUM', tags: ['intimité'] },
];
