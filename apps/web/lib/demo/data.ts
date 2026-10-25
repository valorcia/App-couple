import type { CalendarEventDto, ChallengeDto, DesireItemDto, GameType, IdeaDto, NotificationDto, ProductDto, ProjectDto, ShoppingListDto, TaskDto } from '@couple/types';

export const ME_ID = 'demo-user-me';
export const PARTNER_ID = 'demo-user-partner';
export const COUPLE_ID = 'demo-couple';

let seq = 0;
export const nid = (p = 'd') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const day = (offset: number, h: number, m = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const dateOnly = (offset: number) => day(offset, 12).slice(0, 10);

export interface DemoState {
  profile: { displayName: string; bio: string | null; interests: string[]; adultConfirmed: boolean };
  couple: { name: string | null; metAt: string | null; anniversaryAt: string | null };
  events: CalendarEventDto[];
  sessions: DemoSession[];
  daily: { text: string; myAnswer: string | null; partnerAnswer: string; revealedAt: string | null };
  challengeProgress: Record<string, ChallengeDto['progress']>;
  intimacy: { enabled: boolean; enabledCategories: DesireItemDto['category'][]; maxIntensity: number; myChoices: Record<string, 'YES' | 'NO' | 'MAYBE'>; iRequested: boolean; revealedAt: string | null; tonightMine: boolean; tonightPartner: boolean; cardsSeen: string[]; cardsDone: number; currentCard: { id: string; drawnByUserId: string; drawnAt: string } | null };
  notifications: NotificationDto[];
  notificationPrefs: { category: string; push: boolean; inApp: boolean; email: boolean; maxPerDay: number | null }[];
  quiet: { start: string | null; end: string | null };
  lists: ShoppingListDto[];
  tasks: TaskDto[];
  projects: ProjectDto[];
  doneIdeas: string[];
}

export interface DemoRound {
  index: number;
  prompt: { text: string; options?: string[]; subjectUserId?: string; categoryCode?: string | null; level?: number };
  myAnswer: { kind: 'text'; text: string } | { kind: 'choice'; index: number } | { kind: 'vote'; userId: string } | null;
  partnerAnswer: { kind: 'text'; text: string } | { kind: 'choice'; index: number } | { kind: 'vote'; userId: string } | null;
  revealedAt: string | null;
  skipped: boolean;
  verdict: 'EXACT' | 'CLOSE' | 'MISS' | null;
}
export interface DemoSession {
  id: string;
  gameType: GameType;
  status: 'OPEN' | 'COMPLETED' | 'ABANDONED';
  rounds: DemoRound[];
  createdAt: string;
  completedAt: string | null;
}

export const CATEGORIES = [
  { code: 'love', name: 'Amour', description: 'Ce qui vous lie, ce qui vous touche.', icon: 'sparkles', gameTypes: ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'CONFESSIONS'] },
  { code: 'humor', name: 'Humour', description: 'Pour rire de vous, ensemble.', icon: 'laugh', gameTypes: ['SECRET_ANSWERS', 'WHICH_OF_US', 'DILEMMA'] },
  { code: 'daily', name: 'Quotidien', description: 'Les petites choses de tous les jours.', icon: 'coffee', gameTypes: ['SECRET_ANSWERS', 'WHO_KNOWS_BEST', 'WHICH_OF_US'] },
  { code: 'travel', name: 'Vacances', description: 'Envies d’ailleurs.', icon: 'plane', gameTypes: ['SECRET_ANSWERS', 'DILEMMA', 'WHO_KNOWS_BEST'] },
  { code: 'future', name: 'Avenir', description: 'Ce que vous construisez.', icon: 'compass', gameTypes: ['SECRET_ANSWERS', 'DILEMMA', 'CONFESSIONS'] },
  { code: 'intimacy', name: 'Intimité', description: 'Réservé à l’espace Intimité.', icon: 'lock', gameTypes: ['SECRET_ANSWERS', 'CONFESSIONS'] },
] as const;

export const QUESTIONS: Record<GameType, { category: string; text: string; options?: string[]; level?: number }[]> = {
  SECRET_ANSWERS: [
    { category: 'love', text: 'Quel est le moment de notre histoire que tu rejouerais volontiers ?' },
    { category: 'love', text: 'Quelle petite attention de ma part te touche le plus ?' },
    { category: 'humor', text: 'Si notre couple était une série télé, quel en serait le titre ?' },
    { category: 'daily', text: 'Quel moment de la journée préfères-tu passer avec moi ?' },
    { category: 'travel', text: 'Où partirais-tu demain si tout était possible ?' },
  ],
  WHO_KNOWS_BEST: [
    { category: 'daily', text: 'Quel est mon petit-déjeuner idéal ?' },
    { category: 'love', text: 'Quelle chanson me rappelle notre rencontre ?' },
    { category: 'travel', text: 'Quelle est la ville que je rêve de visiter ?' },
    { category: 'daily', text: 'Quel est mon plat réconfortant ?' },
  ],
  DILEMMA: [
    { category: 'humor', text: 'Un week-end sans téléphone ou un week-end sans musique ?', options: ['Sans téléphone', 'Sans musique'] },
    { category: 'travel', text: 'Plutôt montagne en hiver ou mer en été ?', options: ['Montagne en hiver', 'Mer en été'] },
    { category: 'humor', text: 'Cuisiner ensemble ou se faire livrer ?', options: ['Cuisiner ensemble', 'Se faire livrer'] },
    { category: 'future', text: 'Une grande maison loin de tout ou un petit appartement en plein centre ?', options: ['Grande maison', 'Petit appartement'] },
  ],
  WHICH_OF_US: [
    { category: 'humor', text: 'Lequel de nous deux rit le plus fort au cinéma ?' },
    { category: 'daily', text: 'Lequel de nous deux oublie toujours ses clés ?' },
    { category: 'daily', text: 'Lequel de nous deux prend les meilleures décisions de dernière minute ?' },
    { category: 'humor', text: 'Lequel de nous deux chante le plus faux ?' },
  ],
  CONFESSIONS: [
    { category: 'love', text: 'Un compliment que je ne t’ai jamais fait à voix haute.', level: 1 },
    { category: 'love', text: 'Ce que j’admire le plus chez toi, honnêtement.', level: 1 },
    { category: 'future', text: 'Une chose que j’aimerais qu’on ose ensemble cette année.', level: 2 },
    { category: 'love', text: 'Un moment où j’ai eu peur de te perdre.', level: 3 },
    { category: 'intimacy', text: 'Où as-tu envie que je t’embrasse, là, maintenant ?', level: 3 },
    { category: 'intimacy', text: 'Décris-moi le fantasme que tu n’as jamais osé me dire.', level: 4 },
    { category: 'intimacy', text: 'Qu’est-ce que tu aimerais que je te fasse ce soir, précisément ?', level: 4 },
  ],
  CHALLENGE: [],
  MEMORY_QUIZ: [],
};

export const PARTNER_TEXTS = ['Notre premier week-end à la mer, sans aucun doute.', 'Quand tu me prépares un café sans que je le demande.', '« Les Deux Font la Paire », saison 7.', 'Le soir, quand on se raconte nos journées.', 'Lisbonne, demain matin, sans valise.', 'Des tartines beurrées et un grand thé.', 'Celle qu’on a écoutée en boucle cet été.', 'Kyoto, au printemps.', 'Un gratin dauphinois.', 'Que tu sais toujours me faire rire quand ça ne va pas.', 'Ta façon d’écouter vraiment les gens.', 'Un road trip sans itinéraire.', 'Le jour où tu as été hospitalisée.'];

export const CHALLENGES: ChallengeDto[] = [
  { id: 'ch-mot-cache', title: 'Le mot caché', description: 'Glissez chacun un mot doux là où l’autre le trouvera dans la journée.', instructions: ['Écrivez un mot à la main.', 'Cachez-le dans un endroit que l’autre utilisera aujourd’hui.', 'Ne dites rien, attendez la réaction.'], durationMinutes: 10, difficulty: 'EASY', budget: 'FREE', materials: ['papier', 'stylo'], intimate: false, category: { code: 'love', name: 'Amour' }, tags: ['tendresse'], locked: false, progress: null },
  { id: 'ch-diner-aveugle', title: 'Le dîner à l’aveugle', description: 'L’un cuisine, l’autre devine les ingrédients les yeux bandés.', instructions: ['Préparez trois bouchées surprises.', 'Bandez les yeux de votre partenaire.', 'Un point par ingrédient deviné.'], durationMinutes: 45, difficulty: 'MEDIUM', budget: 'LOW', materials: ['foulard'], intimate: false, category: { code: 'humor', name: 'Humour' }, tags: ['cuisine', 'rire'], locked: false, progress: null },
  { id: 'ch-echange-roles', title: 'Échange de rôles', description: 'Pendant une soirée, chacun prend les habitudes de l’autre.', instructions: ['Listez trois habitudes typiques de chacun.', 'Échangez-les pour la soirée.', 'Débriefez : qu’avez-vous découvert ?'], durationMinutes: 180, difficulty: 'MEDIUM', budget: 'FREE', materials: [], intimate: false, category: { code: 'daily', name: 'Quotidien' }, tags: ['quotidien'], locked: false, progress: null },
  { id: 'ch-voyage-sans-partir', title: 'Voyage sans partir', description: 'Choisissez un pays au hasard et vivez une soirée à ses couleurs.', instructions: ['Tirez un pays au sort.', 'Un plat, une musique, un mot appris.', 'Prenez une photo souvenir.'], durationMinutes: 120, difficulty: 'MEDIUM', budget: 'LOW', materials: [], intimate: false, category: { code: 'travel', name: 'Vacances' }, tags: ['aventure', 'cuisine'], locked: false, progress: null },
  { id: 'ch-marche', title: 'Marche sans destination', description: 'Partez marcher 30 minutes : à chaque carrefour, l’un de vous choisit la direction.', instructions: ['Téléphones en poche.', 'Alternez le choix à chaque intersection.', 'Terminez par un café ou un banc.'], durationMinutes: 40, difficulty: 'EASY', budget: 'FREE', materials: [], intimate: false, category: { code: 'daily', name: 'Quotidien' }, tags: ['plein air'], locked: false, progress: null },
  { id: 'ch-karaoke', title: 'Le karaoké de salon', description: 'Chacun choisit une chanson que l’autre devra interpréter avec conviction.', instructions: ['Choisissez une chanson pour l’autre.', 'Interprétation complète obligatoire.', 'Applaudissements obligatoires aussi.'], durationMinutes: 30, difficulty: 'EASY', budget: 'FREE', materials: [], intimate: false, category: { code: 'humor', name: 'Humour' }, tags: ['rire', 'musique'], locked: false, progress: null },
  { id: 'ch-carte-envies', title: 'La carte de nos envies', description: 'Dessinez ensemble une carte des endroits où vous voulez aller et des projets que vous voulez vivre.', instructions: ['Grande feuille ou tableau.', 'Chacun place cinq envies.', 'Entourez celles que vous partagez.'], durationMinutes: 60, difficulty: 'MEDIUM', budget: 'FREE', materials: ['papier', 'feutres'], intimate: false, category: { code: 'future', name: 'Avenir' }, tags: ['projets'], locked: false, progress: null },
  { id: 'ch-compte-a-rebours', title: 'Le compte à rebours', description: 'Trente minutes de préliminaires, montre en main. Interdiction d’aller plus loin avant la sonnerie.', instructions: ['Réglez un minuteur sur 30 minutes.', 'Tout est permis, sauf conclure.', 'À la sonnerie, vous faites ce que vous voulez.'], durationMinutes: 45, difficulty: 'MEDIUM', budget: 'FREE', materials: [], intimate: true, category: { code: 'intimacy', name: 'Intimité' }, tags: ['feu'], locked: false, progress: null },
  { id: 'ch-des-du-soir', title: 'Les dés du soir', description: 'Deux dés : l’un donne le geste, l’autre la zone du corps. Dix lancers, pas un de moins.', instructions: ['Écrivez six gestes et six zones sur deux listes.', 'Lancez à tour de rôle.', 'Chaque lancer dure au moins une minute.'], durationMinutes: 40, difficulty: 'EASY', budget: 'FREE', materials: ['deux dés'], intimate: true, category: { code: 'intimacy', name: 'Intimité' }, tags: ['feu', 'jeu'], locked: false, progress: null },
  { id: 'ch-message-qui-monte', title: 'Le message qui monte', description: 'Toute la journée, un message de plus en plus explicite. Interdiction de se toucher avant le soir.', instructions: ['Premier message à 9 h, le dernier à 21 h.', 'Chaque message va un cran plus loin que le précédent.', 'Le soir, vous tenez vos promesses.'], durationMinutes: 720, difficulty: 'HARD', budget: 'FREE', materials: [], intimate: true, category: { code: 'intimacy', name: 'Intimité' }, tags: ['feu'], locked: false, progress: null },
  { id: 'ch-massage', title: 'Le massage de cinq minutes', description: 'Cinq minutes chacun, sans parler, pour relâcher la journée.', instructions: ['Minuteur réglé sur cinq minutes.', 'Épaules, nuque, mains.', 'Échangez les rôles.'], durationMinutes: 15, difficulty: 'EASY', budget: 'FREE', materials: [], intimate: false, category: { code: 'love', name: 'Amour' }, tags: ['tendresse', 'détente'], locked: false, progress: null },
];

export const DESIRES: Omit<DesireItemDto, 'myChoice'>[] = [
  { id: 'ds-1', category: 'tenderness', intensity: 1, text: 'Un petit-déjeuner au lit préparé par l’autre', locked: false },
  { id: 'ds-2', category: 'tenderness', intensity: 1, text: 'S’endormir en se tenant la main', locked: false },
  { id: 'ds-3', category: 'romance', intensity: 1, text: 'Un dîner aux chandelles à la maison', locked: false },
  { id: 'ds-4', category: 'romance', intensity: 1, text: 'Danser dans le salon sur notre chanson', locked: false },
  { id: 'ds-5', category: 'seduction', intensity: 2, text: 'Un rendez-vous où l’on fait semblant de se rencontrer pour la première fois', locked: false },
  { id: 'ds-6', category: 'seduction', intensity: 2, text: 'Recevoir un message séduisant en pleine journée', locked: false },
  { id: 'ds-7', category: 'complicity', intensity: 2, text: 'Un massage complet à la bougie', locked: false },
  { id: 'ds-8', category: 'complicity', intensity: 2, text: 'Une nuit dans un hôtel de notre ville', locked: false },
  { id: 'ds-9', category: 'desires', intensity: 3, text: 'Une soirée entière consacrée au plaisir de l’autre', locked: false },
  { id: 'ds-10', category: 'desires', intensity: 3, text: 'Se déshabiller mutuellement, très lentement, sans se presser', locked: false },
  { id: 'ds-11', category: 'desires', intensity: 3, text: 'Un massage érotique à l’huile chaude, de la nuque aux pieds, sans zone interdite', locked: false },
  { id: 'ds-12', category: 'desires', intensity: 3, text: 'Une douche à deux dont on ne sort pas tout de suite', locked: false },
  { id: 'ds-13', category: 'fantasies', intensity: 4, text: 'Jouer deux inconnus qui se séduisent dans un bar… et finir la nuit ensemble', locked: false },
  { id: 'ds-14', category: 'fantasies', intensity: 4, text: 'Les yeux bandés : l’un guide, l’autre se laisse faire', locked: false },
  { id: 'ds-15', category: 'fantasies', intensity: 4, text: 'Choisir un sextoy ensemble et le découvrir ensemble', locked: false },
  { id: 'ds-16', category: 'fantasies', intensity: 4, text: 'Mains attachées avec un foulard, l’autre décide de tout', locked: false },
  { id: 'ds-17', category: 'fantasies', intensity: 4, text: 'Une tenue ou de la lingerie choisie par l’autre, portée rien que pour lui ou elle', locked: false },
  { id: 'ds-18', category: 'experiences', intensity: 4, text: 'Une nuit d’hôtel avec jacuzzi privatif, sans rien prévoir d’autre', locked: false },
  { id: 'ds-19', category: 'experiences', intensity: 4, text: 'Faire l’amour en pleine nature, à l’abri des regards', locked: false },
  { id: 'ds-20', category: 'experiences', intensity: 4, text: 'Un week-end entier sans vêtements à la maison', locked: false },
];
/** Choix du partenaire : connus de la simulation seulement, jamais renvoyés tels quels (comme en réel). */
export const PARTNER_DESIRE_YES = new Set(['ds-1', 'ds-3', 'ds-4', 'ds-6', 'ds-7', 'ds-10', 'ds-11', 'ds-14', 'ds-17', 'ds-18']);

export const IDEAS: (Omit<IdeaDto, 'doneBefore' | 'source'> & { moments: string[]; company: string[] })[] = [
  { id: 'id-1', title: 'Pique-nique improvisé', description: 'Un plaid, ce qu’il y a dans le frigo, le parc le plus proche.', budget: 'FREE', durationMinutes: 90, indoor: false, moods: ['RELAX', 'ROMANTIC'], tags: [], moments: ['NOW', 'WEEKEND'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-2', title: 'Soirée cinéma à thème', description: 'Un film, un plat assorti, les lumières tamisées.', budget: 'LOW', durationMinutes: 150, indoor: true, moods: ['RELAX', 'ROMANTIC', 'FUNNY'], tags: [], moments: ['TONIGHT'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-3', title: 'Cours de cuisine à deux', description: 'Choisissez une recette que vous n’avez jamais faite et cuisinez-la ensemble.', budget: 'LOW', durationMinutes: 120, indoor: true, moods: ['FOOD', 'FUNNY'], tags: [], moments: ['TONIGHT', 'WEEKEND'], company: ['COUPLE'] },
  { id: 'id-4', title: 'Exposition ou musée', description: 'Une exposition temporaire près de chez vous.', budget: 'MEDIUM', durationMinutes: 120, indoor: true, moods: ['CULTURE'], tags: [], moments: ['WEEKEND', 'DATE'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-5', title: 'Randonnée au lever du soleil', description: 'Partir tôt, marcher, prendre le petit-déjeuner au sommet.', budget: 'FREE', durationMinutes: 240, indoor: false, moods: ['ADVENTURE', 'RELAX'], tags: [], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-6', title: 'Dîner dans un restaurant jamais testé', description: 'Prenez le premier qui vous intrigue à moins de 20 minutes.', budget: 'MEDIUM', durationMinutes: 120, indoor: true, moods: ['FOOD', 'ROMANTIC'], tags: [], moments: ['TONIGHT', 'DATE'], company: ['COUPLE'] },
  { id: 'id-7', title: 'Blind test maison', description: 'Chacun prépare dix extraits, l’autre devine.', budget: 'FREE', durationMinutes: 60, indoor: true, moods: ['FUNNY'], tags: [], moments: ['NOW', 'TONIGHT'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-8', title: 'Escape game', description: 'Une heure enfermés, un objectif commun.', budget: 'MEDIUM', durationMinutes: 90, indoor: true, moods: ['ADVENTURE', 'FUNNY'], tags: [], moments: ['WEEKEND', 'DATE'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-9', title: 'Soirée jeux de société', description: 'Sortez une boîte oubliée ou essayez un jeu à deux.', budget: 'FREE', durationMinutes: 90, indoor: true, moods: ['FUNNY', 'RELAX'], tags: [], moments: ['NOW', 'TONIGHT'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-10', title: 'Balade à vélo et goûter', description: 'Une boucle tranquille, une pâtisserie à l’arrivée.', budget: 'LOW', durationMinutes: 150, indoor: false, moods: ['RELAX', 'ADVENTURE'], tags: [], moments: ['WEEKEND'], company: ['COUPLE', 'FAMILY'] },
  { id: 'id-11', title: 'Concert ou spectacle', description: 'Regardez la programmation de la semaine et réservez.', budget: 'HIGH', durationMinutes: 180, indoor: true, moods: ['CULTURE', 'ROMANTIC'], tags: [], moments: ['DATE', 'WEEKEND'], company: ['COUPLE'] },
  { id: 'id-12', title: 'Soirée spa à la maison', description: 'Bougies, musique douce, masques et massage.', budget: 'LOW', durationMinutes: 120, indoor: true, moods: ['ROMANTIC', 'RELAX', 'SPICY'], tags: [], moments: ['TONIGHT'], company: ['COUPLE'] },
];

export const PRODUCTS: ProductDto[] = [
  { id: 'pr-month', code: 'premium_monthly', type: 'SUBSCRIPTION', name: 'Premium Couple', description: 'Tous les jeux, défis et catégories, pour vous deux.', priceCents: 499, currency: 'EUR', interval: 'MONTH', entitlementKey: 'premium', active: true },
  { id: 'pr-year', code: 'premium_yearly', type: 'SUBSCRIPTION', name: 'Premium Couple (annuel)', description: 'Deux mois offerts.', priceCents: 2999, currency: 'EUR', interval: 'YEAR', entitlementKey: 'premium', active: true },
];

function event(p: Partial<CalendarEventDto> & { title: string; startAt: string; endAt: string }): CalendarEventDto {
  const mine = p.ownerUserId !== PARTNER_ID;
  return {
    id: nid('ev'), instanceId: '', ownerUserId: mine ? ME_ID : PARTNER_ID, isMine: mine, busy: false, description: null, location: null, allDay: false, timezone: 'Europe/Paris',
    visibility: 'SHARED', type: 'SHARED', color: null, category: null, rrule: null, exdates: [], isRecurring: false, reminders: [], attendees: [], canEdit: mine, surpriseId: null,
    createdAt: day(-10, 9), updatedAt: day(-10, 9), ...p,
  };
}

export function initialState(displayName: string): DemoState {
  return {
    profile: { displayName, bio: null, interests: ['cuisine', 'randonnée'], adultConfirmed: false },
    couple: { name: null, metAt: '2021-06-12', anniversaryAt: '2021-09-04' },
    events: [
      event({ title: 'Appel vidéo avec les parents', startAt: day(0, 18), endAt: day(0, 19), type: 'FAMILY' }),
      event({ title: 'Dîner chez Inès et Malo', startAt: day(1, 19, 30), endAt: day(1, 23), location: 'Chez Inès', type: 'SHARED', attendees: [{ userId: PARTNER_ID, status: 'ACCEPTED', respondedAt: day(-2, 10) }] }),
      event({ title: 'Marché du samedi', startAt: day(((6 - new Date().getDay()) + 7) % 7 || 7, 9, 30), endAt: day(((6 - new Date().getDay()) + 7) % 7 || 7, 11), type: 'SHARED', rrule: 'FREQ=WEEKLY', isRecurring: true }),
      event({ title: 'Occupé', startAt: day(2, 14), endAt: day(2, 16), ownerUserId: PARTNER_ID, visibility: 'BUSY', busy: true, type: 'WORK' }),
      event({ title: 'Rendez-vous dentiste', startAt: day(3, 8, 30), endAt: day(3, 9, 15), visibility: 'PRIVATE', type: 'PERSONAL' }),
      event({ title: 'Week-end à Honfleur', startAt: day(12, 0), endAt: day(14, 0), allDay: true, type: 'VACATION', attendees: [{ userId: PARTNER_ID, status: 'PENDING', respondedAt: null }] }),
      event({ title: 'Anniversaire de Camille', startAt: day(20, 0), endAt: day(21, 0), allDay: true, type: 'BIRTHDAY', ownerUserId: PARTNER_ID }),
    ],
    sessions: [],
    daily: { text: 'Quel petit détail de ce matin t’a fait sourire ?', myAnswer: null, partnerAnswer: 'Ton message avant ma réunion.', revealedAt: null },
    challengeProgress: {},
    intimacy: { enabled: false, enabledCategories: ['tenderness', 'romance', 'seduction', 'complicity', 'desires', 'fantasies', 'experiences'], maxIntensity: 4, myChoices: {}, iRequested: false, revealedAt: null, tonightMine: false, tonightPartner: false, cardsSeen: [], cardsDone: 0, currentCard: null },
    notifications: [
      { id: nid('nt'), category: 'INVITATION', type: 'calendar.invite', title: 'Invitation à un événement', body: 'Camille vous invite : « Week-end à Honfleur ».', data: { path: '/agenda' }, readAt: null, createdAt: day(0, 8, 12) },
      { id: nid('nt'), category: 'DAILY_QUESTION', type: 'daily.prompt', title: 'Question du jour', body: 'Une nouvelle question vous attend.', data: { path: '/accueil' }, readAt: null, createdAt: day(0, 9) },
      { id: nid('nt'), category: 'CHALLENGE', type: 'challenge.completed', title: 'Défi réussi ensemble', body: '« Le massage de cinq minutes » est validé par vous deux.', data: { path: '/defis' }, readAt: day(-1, 21), createdAt: day(-1, 20, 40) },
    ],
    notificationPrefs: ['CALENDAR', 'INVITATION', 'GAME', 'CHALLENGE', 'SURPRISE', 'ANNIVERSARY', 'SUGGESTION', 'DAILY_QUESTION', 'SYSTEM', 'MARKETING'].map((category) => ({ category, push: category !== 'MARKETING', inApp: true, email: category === 'SYSTEM', maxPerDay: category === 'SUGGESTION' ? 2 : null })),
    quiet: { start: '22:00', end: '07:30' },
    lists: [
      { id: 'sl-1', name: 'Courses de la semaine', archivedAt: null, itemCount: 4, checkedCount: 1, updatedAt: day(0, 8), items: [
        { id: 'si-1', name: 'Tomates', quantity: '1 kg', category: 'Fruits et légumes', position: 1, checkedAt: null, checkedByUserId: null },
        { id: 'si-2', name: 'Lait d’avoine', quantity: '2 L', category: 'Frais', position: 2, checkedAt: null, checkedByUserId: null },
        { id: 'si-3', name: 'Café en grains', quantity: '250 g', category: 'Épicerie', position: 3, checkedAt: null, checkedByUserId: null },
        { id: 'si-4', name: 'Pain complet', quantity: '1', category: 'Boulangerie', position: 4, checkedAt: day(0, 7, 50), checkedByUserId: PARTNER_ID },
      ] },
    ],
    tasks: [
      { id: 'tk-1', title: 'Appeler le plombier', description: 'Fuite sous l’évier, devis à demander.', creatorUserId: ME_ID, assigneeUserId: PARTNER_ID, projectId: null, priority: 'HIGH', status: 'OPEN', dueAt: day(1, 15), rrule: null, completedAt: null, comments: [{ id: 'tc-1', userId: PARTNER_ID, body: 'Je m’en occupe demain matin.', createdAt: day(0, 10) }], createdAt: day(-1, 9), updatedAt: day(0, 10) },
      { id: 'tk-2', title: 'Sortir les poubelles', description: null, creatorUserId: PARTNER_ID, assigneeUserId: ME_ID, projectId: null, priority: 'MEDIUM', status: 'OPEN', dueAt: day(0, 20), rrule: 'FREQ=WEEKLY', completedAt: null, comments: [], createdAt: day(-7, 9), updatedAt: day(-7, 9) },
      { id: 'tk-3', title: 'Réserver les vols', description: null, creatorUserId: ME_ID, assigneeUserId: null, projectId: 'pj-1', priority: 'MEDIUM', status: 'OPEN', dueAt: null, rrule: null, completedAt: null, comments: [], createdAt: day(-3, 9), updatedAt: day(-3, 9) },
      { id: 'tk-4', title: 'Choisir un cadeau pour Noa', description: null, creatorUserId: PARTNER_ID, assigneeUserId: null, projectId: null, priority: 'LOW', status: 'DONE', dueAt: null, rrule: null, completedAt: day(-2, 18), comments: [], createdAt: day(-5, 9), updatedAt: day(-2, 18) },
    ],
    projects: [
      { id: 'pj-1', templateCode: 'trip', title: 'Lisbonne au printemps', goal: 'Une semaine à deux, budget maîtrisé', description: null, status: 'ACTIVE', startAt: null, targetAt: dateOnly(160), budgetCents: 150000, currency: 'EUR', progress: 29, openTasks: 1, createdAt: day(-20, 9), updatedAt: day(-1, 9),
        steps: ['Choisir la destination et les dates', 'Fixer le budget', 'Réserver les transports', 'Réserver les hébergements', 'Préparer l’itinéraire', 'Vérifier papiers et assurances', 'Faire les valises'].map((title, i) => ({ id: `ps-1-${i}`, title, position: i, dueAt: null, completedAt: i < 2 ? day(-5 + i, 20) : null })),
        notes: [{ id: 'pn-1', body: 'Vols repérés à 90 € l’aller-retour depuis Nantes.', createdAt: day(-1, 21), updatedAt: day(-1, 21) }] },
      { id: 'pj-2', templateCode: 'move', title: 'Déménagement à Rennes', goal: null, description: null, status: 'ACTIVE', startAt: null, targetAt: null, budgetCents: null, currency: 'EUR', progress: 0, openTasks: 0, createdAt: day(-2, 9), updatedAt: day(-2, 9),
        steps: ['Fixer la date', 'Résilier et souscrire les contrats (énergie, internet)', 'Changement d’adresse', 'Trier et donner', 'Cartons', 'Réserver camion ou déménageurs', 'État des lieux', 'Installation'].map((title, i) => ({ id: `ps-2-${i}`, title, position: i, dueAt: null, completedAt: null })),
        notes: [] },
    ],
    doneIdeas: ['id-9'],
  };
}

export const CARDS: { id: string; level: number; role: 'DRAWER' | 'PARTNER' | 'BOTH'; text: string; durationSec: number | null }[] = [
  { id: 'cd-1', level: 1, role: 'DRAWER', text: 'Embrasse-moi dans le cou, une minute, sans un mot.', durationSec: 60 },
  { id: 'cd-2', level: 1, role: 'DRAWER', text: 'Dis-moi trois choses que tu aimes dans mon corps, en les touchant.', durationSec: null },
  { id: 'cd-3', level: 1, role: 'BOTH', text: 'Front contre front, yeux fermés, une minute de silence.', durationSec: 60 },
  { id: 'cd-4', level: 2, role: 'DRAWER', text: 'Enlève-moi un vêtement, le plus lentement possible.', durationSec: null },
  { id: 'cd-5', level: 2, role: 'DRAWER', text: 'Embrasse-moi partout sauf sur la bouche.', durationSec: 120 },
  { id: 'cd-6', level: 2, role: 'PARTNER', text: 'Je ferme les yeux. Fais-moi deviner avec quoi tu me touches : une plume, tes lèvres, ta langue.', durationSec: null },
  { id: 'cd-7', level: 3, role: 'DRAWER', text: 'Caresse-moi par-dessus mes vêtements jusqu’à ce que je te demande de les enlever.', durationSec: null },
  { id: 'cd-8', level: 3, role: 'DRAWER', text: 'Embrasse l’intérieur de mes cuisses en remontant très lentement, sans aller au bout avant la fin du temps.', durationSec: 60 },
  { id: 'cd-9', level: 3, role: 'PARTNER', text: 'Je ne bouge pas. Tu as deux minutes pour me faire perdre mon calme avec tes mains seulement.', durationSec: 120 },
  { id: 'cd-10', level: 4, role: 'DRAWER', text: 'À genoux, les yeux dans les miens : une minute de bouche, sans te presser.', durationSec: 60 },
  { id: 'cd-11', level: 4, role: 'DRAWER', text: 'Allonge-toi. Je te fais jouir avec ma bouche, et tu n’as pas le droit de me toucher.', durationSec: null },
  { id: 'cd-12', level: 4, role: 'DRAWER', text: 'Bande-moi les yeux et utilise ta bouche là où tu veux.', durationSec: 120 },
  { id: 'cd-13', level: 4, role: 'DRAWER', text: 'Mets-toi sur moi et donne le rythme, lentement, jusqu’à ce que je te supplie d’accélérer.', durationSec: null },
  { id: 'cd-14', level: 4, role: 'BOTH', text: 'Face à face, chacun se caresse en regardant l’autre, sans se toucher, jusqu’à ce que l’un des deux cède.', durationSec: null },
  { id: 'cd-15', level: 4, role: 'PARTNER', text: 'Je m’allonge et je te laisse tout décider : où, comment, combien de temps.', durationSec: null },
];
