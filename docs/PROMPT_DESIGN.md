# PROMPT — REFONTE VISUELLE « COCOONING » D'ENTRE NOUS

> À coller tel quel dans une session Claude Code ouverte sur le dépôt `valorcia/App-couple` (branche `master`).

---

Tu es directeur artistique et développeur front senior. Tu travailles sur **Entre Nous**, une application pour couples (web Next.js 15 + Tailwind 4, design system dans `packages/ui`, app mobile Expo). Le produit fonctionne : toute la logique métier, l'API, les tests et le mode démo existent déjà. **Ta mission est purement visuelle et émotionnelle : rendre l'application belle, chaleureuse, cocooning, et donner envie de l'ouvrir chaque soir à deux.** Aujourd'hui l'interface est propre mais froide et générique : des cartes blanches alignées, peu de chaleur, aucune émotion.

## 1. Lis d'abord
1. `docs/DESIGN_SYSTEM.md` (direction actuelle, tokens, composants) et `docs/PRODUCT_SPEC.md` §1 (positionnement : S'AIMER — S'AMUSER — CONSTRUIRE ENSEMBLE ; ni quiz, ni réseau social, ni app sexuelle, ni thérapie).
2. `packages/ui/src/tokens.css` (palette ivoire / blush / corail / prune / champagne, clair et sombre), `packages/ui/src/components/*` (Button, Card, Input, Field, Badge, Avatar, Dialog, Switch, Segmented/Chip, Checkbox, Progress, Select, EmptyState, Skeleton, Blob, Logo, Alert).
3. `apps/web/app/globals.css`, `apps/web/components/app/app-shell.tsx` (coque + navigation), `apps/web/components/app/dashboard.tsx`, `apps/web/components/marketing/*` et `apps/web/app/(marketing)/page.tsx` (landing), `apps/web/components/auth/auth-card.tsx`.
4. Lance l'application en **mode démo** pour voir chaque écran avec des données réalistes sans serveur : `pnpm --filter @couple/web dev`, puis http://localhost:3000/connexion → « Explorer la démo ». Prends des captures (Playwright est installé : `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`) de chaque page avant de toucher quoi que ce soit : landing, connexion, accueil, agenda (semaine et mois), jouer + une partie, défis, intimité, quotidien (3 onglets) + détail d'un projet, notifications, premium, profil. Clair **et** sombre, desktop **et** mobile (390 px).

## 2. Direction artistique attendue : « un soir d'hiver à deux »
L'ambiance cible : un salon le soir, plaid, bougie, lumière chaude et basse, papier épais, encre douce. Chaleureux, intime, rassurant, un peu artisanal, jamais clinique, jamais « SaaS ». On doit se sentir à la maison, pas dans un outil.

Concrètement :
- **Lumière et matière** : fonds ivoire chauds avec de très légers dégradés radiaux (halo chaud en haut de page), grain de papier subtil (bruit SVG à 2–4 % d'opacité), ombres douces et colorées (prune ou corail désaturés, jamais gris pur), rayons généreux (16–28 px), cartes qui ressemblent à des cartes épaisses ou des coussins, pas à des rectangles.
- **Couleur** : garde la palette de marque mais rends-la plus profonde et plus enveloppante : corail plus velouté (vers le terracotta), prune plus chaude, ajoute un **caramel / miel** et un **vert sauge** discret pour les états positifs. Mode sombre « veilleuse » : fond brun-prune très sombre (pas noir), surfaces légèrement plus claires et chaudes, accents corail adoucis, aucune couleur criarde.
- **Typographie** : Fraunces (display) doit respirer : titres plus grands, graisses optiques variées (axe `opsz`, `SOFT`, `WONK` de Fraunces pour un côté manuscrit sur les titres d'accueil et de jeux), italiques pour les phrases douces (question du jour, citations, révélations). Inter pour le texte courant, interlignage généreux. Hiérarchie claire mais jamais rigide.
- **Illustration** : ajoute des formes organiques (blobs doux déjà présents dans `Blob`), des motifs discrets (petits points, lignes de couture, pastilles), éventuellement quelques pictos « doodle » monochromes en SVG inline pour les états vides et les en-têtes de module (une tasse, un plaid, une guirlande, un carnet). Aucune image stock de couple, aucune photo réaliste, aucun stéréotype de genre.
- **Mouvement** : micro-animations douces (apparition en fondu + légère translation, 250–400 ms, courbe `--ease`), cartes qui « respirent » au survol (ombre et translation de 2 px), révélation des réponses de jeu avec un effet de retournement ou de rideau lent. Respecter `prefers-reduced-motion`.
- **Ton** : les textes sont déjà en français dans `apps/web/messages/fr.json` ; tu peux les adoucir (plus chaleureux, tutoiement entre partenaires conservé, jamais mièvre) mais chaque clé doit rester présente.

## 3. Écrans prioritaires (dans cet ordre)
1. **Landing** (`/`) : doit donner envie en 5 secondes. Grand titre Fraunces, promesse émotionnelle, visuel chaleureux (composition de cartes « mockup » de l'app en léger 3D ou en éventail, pas de capture brute), trois piliers illustrés, bloc « On fait quoi ? », aperçu des jeux, témoignage factice clairement marqué comme exemple, tarifs (4,99 €/mois, 29,99 €/an, pour deux), FAQ courte, pied de page.
2. **Connexion / inscription** : carte chaleureuse, halo, phrase d'accueil douce, bouton de démo visible mais secondaire.
3. **Coque applicative** : barre latérale plus douce (fond légèrement teinté, items arrondis, icône active « pastille »), barre mobile basse avec bouton central « On fait quoi ? » proéminent, bandeau démo intégré au style.
4. **Accueil** : la « pièce principale ». Salutation selon l'heure, carte « On fait quoi ? » en héros chaleureux, question du jour comme une carte postale, prochains événements comme une petite frise, défi du moment, raccourcis en pastilles.
5. **Jeux** (catalogue + partie) : catalogue en cartes colorées différenciées par jeu, écran de partie immersif (fond prune profond, question en très grand, révélation théâtrale, résumé festif sans classement agressif).
6. **Agenda**, **Défis**, **Quotidien**, **Intimité** (sobriété et douceur absolues, jamais racoleur), **Notifications**, **Premium**, **Profil**.
7. Mobile Expo (`apps/mobile`) ensuite, en reportant les tokens dans `apps/mobile/lib/theme.ts` et `components/ui.tsx`.

## 4. Contraintes non négociables
- **Zéro régression fonctionnelle.** Ne change ni les appels d'API, ni les hooks, ni la logique, ni les routes, ni les `data-*`/`aria-*` qui servent aux tests. Les 12 scénarios Playwright (`pnpm --filter @couple/web test:e2e`) et `pnpm turbo run lint typecheck` doivent rester verts ; si un libellé utilisé par un test change, mets le test à jour avec le même sens.
- **Tout passe par le design system** : modifie et enrichis `packages/ui` (tokens, composants, nouveaux composants réutilisables comme `Surface`, `SectionHeader`, `Illustration`, `Glow`) plutôt que d'empiler des classes ad hoc dans les pages. Aucun texte en dur : tout dans `messages/fr.json`.
- **Accessibilité** : contrastes AA (texte 4,5:1, y compris sur fonds colorés et en sombre), focus visibles et élégants, cibles tactiles ≥ 44 px, `prefers-reduced-motion`, navigation clavier intacte.
- **Confidentialité visible** : les éléments « Occupé », « Privé », révélations de jeux et espace Intimité doivent rendre la discrétion évidente (icônes de verrou, textes rassurants), jamais l'inverse.
- **Performance** : pas de nouvelle dépendance lourde (pas de bibliothèque d'animation > 10 ko gz sans justification), SVG inline optimisés, aucune image > 150 ko, pas de police supplémentaire au-delà de Fraunces et Inter.
- **Honnêteté** : aucune maquette d'une fonctionnalité qui n'existe pas (souvenirs, surprises, assistant) sans badge « Bientôt disponible ».

## 5. Méthode
1. Audit visuel écrit (10 lignes max par écran) à partir des captures « avant ».
2. Proposition de direction : mets à jour `docs/DESIGN_SYSTEM.md` (palette finale avec valeurs hex clair/sombre, échelle typographique, ombres, rayons, motifs, règles de mouvement, exemples de composition) **avant** de coder.
3. Implémente tokens → composants → coque → écrans, en commitant par étape avec un message clair.
4. À chaque étape : captures « après » dans `apps/web/e2e/screenshots/` (mêmes pages, clair/sombre, desktop/mobile), relis-les, corrige ce qui est moche ou incohérent, puis lance lint, typecheck et e2e.
5. Termine par un récapitulatif : ce qui a changé, captures avant/après, points restants, et mets à jour `DEVELOPMENT_STATUS.md`.

## 6. Critères de réussite
- En ouvrant l'accueil en mode démo, on a envie de rester : chaleur, douceur, lisibilité, une seule action évidente.
- Un écran pris au hasard est reconnaissable comme « Entre Nous » sans logo.
- Le mode sombre est un cocon, pas une inversion.
- Rien n'est cassé, tout est testé, aucun texte en dur, aucun stéréotype.
