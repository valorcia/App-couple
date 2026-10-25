# PRODUCT_SPEC — Entre Nous

Version 0.1 — cadrage initial. Langue de référence : français.

## 1. Vision

Entre Nous est le compagnon intelligent du couple : il simplifie le quotidien
(agenda, listes, tâches, projets) et crée des occasions de partager des moments
(jeux, défis, surprises, expériences, souvenirs), avec un assistant IA au service
du couple. Il favorise la vraie vie : l'application propose, le couple vit.

Piliers : **S'aimer — S'amuser — Construire ensemble.**

### Ce que le produit n'est pas
Pas une app de questions, pas un réseau social, pas une app sexuelle, pas un
simple calendrier, pas un outil de thérapie, pas un gestionnaire de tâches classique.

### Principes produit non négociables
1. **Égalité des partenaires** : aucun rôle « propriétaire » du couple, droits identiques.
2. **Consentement explicite** : tout contenu intime est opt-in par chaque partenaire ; aucune
   révélation sans accord mutuel ; retrait possible à tout moment.
3. **Confidentialité par défaut** : le privé reste privé (événements, conversations IA
   personnelles, réponses individuelles). Protection au niveau API, pas seulement UI.
4. **Pas de pression** : aucun classement domestique, aucune pénalité d'abandon, aucun
   dark pattern de rétention. Les notifications sont utiles et limitées.
5. **Inclusivité** : aucune hypothèse sur le genre, l'orientation, la composition du couple,
   la présence d'enfants ou l'ancienneté de la relation.
6. **IA honnête** : l'IA propose, ne réserve jamais, n'écrit jamais dans l'espace partagé
   sans validation humaine, ne s'entraîne pas sur les données intimes.

## 2. Personas

| Persona | Contexte | Besoins dominants |
| --- | --- | --- |
| Camille & Alex (28/30) | En couple depuis 1 an, pas d'enfants, vivent ensemble depuis peu | Se découvrir, sortir, jouer, organiser le quotidien à deux |
| Nadia & Thomas (38/41) | 12 ans de relation, 2 enfants | Agenda familial fiable, retrouver du temps à deux, surprises simples |
| Jeanne & Marie (55/58) | 25 ans ensemble | Projets (voyage, maison), souvenirs, redécouverte, complicité |
| Paul & Hugo (24/26) | Relation récente, à distance | Jeux asynchrones, questions, planifier les retrouvailles |

## 3. Parcours utilisateurs clés

### P1 — Inscription et association du couple
1. Création de compte (e-mail + mot de passe, ou Apple/Google ultérieurement).
2. Vérification e-mail (obligatoire avant association).
3. Onboarding court : prénom/pseudo, langue, fuseau, confirmation de majorité (requis pour
   activer l'espace intimité, facultatif sinon).
4. Création du couple → génération d'un **code d'invitation** (8 caractères, 72 h, usage
   unique) + lien profond. Envoi par le canal du choix de l'utilisateur.
5. Le partenaire crée son compte, saisit le code → les deux comptes sont associés.
   Un utilisateur ne peut appartenir qu'à **un seul couple actif**.
6. Écran « Vous êtes ensemble » → tableau de bord.

### P2 — Tableau de bord et « ON FAIT QUOI ? »
Accueil personnalisé (salutation, prochains événements, question du jour, défi, prochaine
date, suggestion, surprise). Bouton central « On fait quoi ? » → assistant en 4 étapes
(quand / avec qui / budget / ambiance) → 3 à 5 propositions issues du catalogue d'activités
puis enrichies par l'IA quand le quota le permet → « Ajouter à l'agenda » (confirmation
explicite) → événement partagé créé.

### P3 — Agenda partagé
Vue jour/semaine/mois, création d'événement avec visibilité **Privé / Partagé / Occupé**.
Un événement privé n'expose au partenaire que « Occupé » (créneau sans titre, sans lieu,
sans description), appliqué par l'API. Rappels, récurrence (RRULE), invitations internes
(accepter/refuser), catégories et couleurs. Suggestions IA de créneaux communs libres,
toujours facultatives.

### P4 — Jeux
Session de jeu créée par un partenaire, l'autre est notifié. Les réponses sont stockées
individuellement et **jamais renvoyées par l'API avant que les deux aient répondu**
(révélation simultanée). Catalogue de questions/dilemmes/affirmations/défis géré en CMS.

### P5 — Double Secret (intimité)
Activation individuelle par chaque partenaire (majorité confirmée + consentement daté).
Chaque partenaire répond seul à un catalogue d'envies (Oui / Non / Peut-être). Le serveur
calcule l'intersection des « Oui ». Seul le **nombre** d'envies communes est exposé ; la
révélation du contenu nécessite une action positive des deux. Aucun indice sur les
réponses non partagées (pas de compteur par catégorie, pas de différence de latence, pas
d'ordre révélateur). Retrait du consentement = masquage immédiat, suppression possible.

### P6 — Surprise
Un partenaire choisit date, budget, ambiance → idées → sélection → créneau « Surprise »
dans l'agenda partagé avec titre masqué → invitation mystérieuse. L'autre accepte ou
refuse le créneau sans voir les détails. Indices programmables, compte à rebours, révélation.

### P7 — Abonnement
Paywall contextuel (au moment où une fonctionnalité Premium est sollicitée). Web : Stripe
Checkout. Mobile : achats in-app via RevenueCat (Apple / Google). Un abonnement couvre
le **couple** (entitlement au niveau du couple). Jamais de paiement simulé.

### P8 — Séparation / suppression
Un partenaire peut quitter le couple : le couple passe en « dissous », chacun conserve ses
données personnelles ; les données communes sont conservées en lecture pour les deux
pendant 30 jours puis archivées selon la politique (voir SECURITY.md). Suppression de
compte : export RGPD disponible, suppression effective sous 30 jours avec purge des
médias.

## 4. Périmètre MVP commercial (Phase 3)

| # | Fonctionnalité | Gratuit | Premium |
| --- | --- | --- | --- |
| 1 | Tableau de bord + « On fait quoi ? » | catalogue | catalogue + IA |
| 2 | Agenda partagé (CRUD, visibilité, récurrence, rappels) | ✔ | ✔ |
| 3 | Réponses secrètes (question du jour) | 1/jour | illimité |
| 4 | Qui connaît le mieux l'autre ? / Dilemmes / Lequel de nous deux ? | 2 catégories | toutes |
| 5 | Défis à deux | 5 défis | catalogue complet |
| 6 | Double Secret | 1 catégorie | toutes |
| 7 | Listes de courses & tâches | ✔ | ✔ |
| 8 | Abonnement couple (Stripe web, RevenueCat mobile) | — | ✔ |
| 9 | Notifications push/in-app, préférences, heures silencieuses | ✔ | ✔ |
| 10 | Back-office contenus (CMS questions/défis/catégories/packs) | — | — |

Quotas et limites sont des **paramètres** (table `AppSetting` + `FeatureFlag`), pas des
constantes.

## 5. Modèle économique

- Gratuit : voir tableau.
- Premium Couple : 4,99 €/mois ou 29,99 €/an (configurables en administration via la
  table `Product`; les identifiants Stripe/Apple/Google sont liés à chaque produit).
- Achats ponctuels : packs (jeux, défis, questions, soirées thématiques) — `Product` de
  type `PACK` → `Entitlement` permanent au niveau du couple.
- Les règles des boutiques : tout contenu numérique consommé dans l'app mobile passe par
  l'achat in-app. Le web utilise Stripe. L'app mobile n'affiche pas de lien de paiement
  externe sauf là où la réglementation locale le permet (paramètre par pays, désactivé
  par défaut).

## 6. Règles métier transverses

- Un couple = exactement 2 membres actifs (contrainte applicative + index unique partiel).
- Toute ressource « commune » porte `coupleId` ; toute requête est filtrée par le couple de
  l'utilisateur authentifié (garde `CoupleGuard`).
- Toute ressource « personnelle » porte `ownerUserId` ; le partenaire n'y accède jamais,
  sauf projection explicite (ex. « Occupé »).
- L'IA n'a accès qu'aux données autorisées par la portée de la conversation (personnelle
  vs commune) et aux disponibilités (jamais aux détails d'événements privés).
- Les contenus (questions, défis…) ont un `locale`, une `category`, un `level`, un `tier`
  (FREE/PREMIUM/PACK) et un `status` (DRAFT/PUBLISHED/ARCHIVED).

## 7. Métriques de succès (sans inventer de chiffres)

Suivies dans l'admin : inscriptions, couples associés, taux d'association (compte →
couple), activation J7, rétention J30, conversion Premium, MRR, churn, coût IA par couple,
stockage par couple. Objectifs chiffrés à fixer après les premières cohortes.
