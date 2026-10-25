# ROADMAP — Entre Nous

| Phase | Contenu | Critère de sortie |
| --- | --- | --- |
| **1. Cadrage** | Spécification, architecture, schéma, sécurité, design system, décisions | Documents validés, arbitrages identifiés |
| **2. Socle technique** | Monorepo, base de données + migrations, auth (inscription, e-mail, connexion, refresh, reset), profils, association du couple, permissions, design system, navigation web/mobile, OpenAPI, admin initial (connexion admin, utilisateurs, flags, paramètres) | `pnpm test` vert ; parcours « créer compte → inviter → associer » fonctionnel de bout en bout sur le web |
| **3. MVP commercial** | Tableau de bord, agenda partagé (CRUD, visibilité, récurrence, rappels, invitations), question du jour + Réponses secrètes, Qui connaît le mieux, Dilemmes, Lequel de nous deux, Défis, Double Secret, « On fait quoi ? » (catalogue + IA), abonnements (Stripe web + RevenueCat mobile, entitlements), notifications push/in-app, CMS contenus | Chaque module testé (unit + API + authz), temps réel opérationnel, paywall réel, mobile parité fonctionnelle sur les modules MVP |
| **4. Fonctions avancées** | Assistant IA (personnel/commun, outils), surprises, générateur d'expériences, projets, listes de courses & tâches temps réel, souvenirs (S3, quotas), synchronisation Google/Microsoft, ICS | Idem + tests de synchronisation et de suppression |
| **5. Commercialisation** | Site marketing (SEO, pages légales, cookies), parcours d'abonnement finalisés, analytics, OAuth Apple/Google, 2FA admin, DPIA, tests de charge, CI/CD complet, runbook, préparation App Store / Play Store | Checklist de lancement validée |

## Jalons intermédiaires de la Phase 3 (ordre d'implémentation)
1. Agenda (modèle le plus structurant) + temps réel.
2. Moteur de jeux (`packages/game-engine`) + Réponses secrètes + question du jour.
3. Dilemmes, Lequel de nous deux, Qui connaît le mieux (réutilisent le moteur).
4. Défis + progression.
5. Double Secret (consentement, intersection, révélation).
6. « On fait quoi ? » : catalogue → agenda ; IA ensuite.
7. Abonnements et entitlements (Stripe d'abord, RevenueCat ensuite) + quotas gratuits.
8. Notifications (préférences, heures silencieuses, push Expo).
9. CMS admin (questions, défis, envies, activités, packs, traductions).
10. Mobile : écrans des modules ci-dessus.

## Hors périmètre initial (volontairement)
Chat entre partenaires (les messageries existent), géolocalisation du partenaire,
contenus vidéo produits en interne, marketplace d'activités avec réservation.
