# DESIGN_SYSTEM — Entre Nous

## 1. Direction artistique
**Éditorial chaleureux.** Une revue lifestyle haut de gamme plutôt qu'une app SaaS :
grandes marges, typographie expressive, cartes aux coins doux, photographie et
illustrations abstraites (formes organiques, textures papier), peu de couleurs vives à la
fois. Les émotions passent par la lumière et le rythme, pas par des cœurs.

Mots-clés : intime, lumineux, calme, complice, précis.

À éviter : cœurs en motif, dégradés saturés, écrans denses, iconographie enfantine,
tableaux de bord « corporate ».

## 2. Couleurs

### Palette de marque
| Token | Clair | Sombre | Usage |
| --- | --- | --- | --- |
| `--ivory` | `#F8F3EC` | — | fond principal clair |
| `--blush` (rose poudré) | `#EBC9C4` | `#5A3B3B` | surfaces douces, accents secondaires |
| `--coral` | `#E0705A` | `#F08A74` | action principale, accent émotionnel |
| `--plum` (prune) | `#4A2A4F` | `#D9C2DB` | titres, texte fort, fond sombre |
| `--champagne` | `#E9D7B4` | `#8A7249` | surlignages, Premium |
| `--charcoal` (anthracite) | `#2B2A2E` | `#1A191C` | texte, fond mode sombre |

### Tokens sémantiques
```
--bg            fond de page
--bg-elevated   cartes
--bg-muted      zones secondaires
--fg            texte principal
--fg-muted      texte secondaire
--border        séparateurs
--primary / --primary-fg      action principale (corail)
--secondary / --secondary-fg  action secondaire (prune)
--accent        champagne (Premium, surlignage)
--success --warning --danger --info
--ring          focus
```
Mode sombre : fond anthracite profond `#1A191C`, cartes `#242328`, texte ivoire
`#F3EDE4`, corail éclairci pour le contraste, prune comme accent. Activation via
`data-theme="dark"` (préférence système par défaut).

Contraste : tous les couples texte/fond ≥ 4,5:1 (AA). Le corail sur ivoire est réservé
aux éléments ≥ 18 px ou aux fonds pleins avec texte blanc.

## 3. Typographie
- Titres : **Fraunces** (variable, serif éditoriale) — poids 500–600, interlettrage -1 %.
- Texte : **Inter** (variable) — 400/500/600.
- Échelle (web) : 12 / 14 / 16 / 18 / 22 / 28 / 36 / 48. Mobile : identique moins un cran
  pour les titres de page.
- Interligne : 1,5 texte, 1,15 titres.

## 4. Espacement, rayons, ombres
- Grille 4 pt : 4, 8, 12, 16, 24, 32, 48, 64.
- Rayons : `sm 10px`, `md 16px`, `lg 24px`, `pill 999px`. Cartes `lg`.
- Ombres très douces et teintées prune : `0 8px 30px -12px rgb(74 42 79 / .18)`.
- Bordures 1 px `--border` (ivoire foncé) plutôt que des ombres fortes.

## 5. Mouvement
- Durées : 150 ms (micro), 250 ms (transitions), 400 ms (révélations).
- Courbe : `cubic-bezier(.2,.8,.2,1)`.
- Moments signature : révélation simultanée des réponses (deux cartes qui se retournent),
  compte à rebours de surprise, case cochée des listes (coche dessinée).
- Respecte `prefers-reduced-motion`.

## 6. Composants (packages/ui)
Base : `Button` (primary, secondary, ghost, danger ; tailles sm/md/lg ; état loading),
`Card`, `Input`, `Textarea`, `Label`, `Field` (label + aide + erreur), `Badge`, `Avatar`,
`Skeleton`, `EmptyState`, `Dialog`, `Sheet` (mobile bottom sheet), `Tabs`, `Toast`,
`Switch`, `Segmented` (choix « Maintenant / Ce soir / Ce week-end »), `Chip`
(ambiances), `ProgressRing`, `Calendar` (jour/semaine/mois), `RevealCard` (jeux),
`CountdownBadge`, `PaywallCard`.

Chaque composant : accessible (rôles ARIA, focus), thémable, documenté par un exemple dans
`apps/web/app/(dev)/styleguide` (hors production).

## 7. Iconographie et illustration
Icônes : Lucide (trait 1,75). Illustrations : formes organiques abstraites générées en SVG
(ellipses superposées en blush/champagne/prune avec flou), jamais de personnages genrés.

## 8. Écrans mobiles
- Navigation par onglets (5 max) : Accueil, Agenda, Jouer, Nous, Plus.
- Bouton « On fait quoi ? » : pastille flottante corail au centre de la barre.
- Bottom sheets pour les flux courts ; pages pleines pour l'agenda et les jeux.
- États : vide (illustration + action), chargement (skeleton), erreur (message +
  réessayer), hors ligne (bandeau).

## 9. Ton rédactionnel
Tutoiement collectif (« vous » pour le couple), phrases courtes, chaleur sans mièvrerie,
aucune injonction culpabilisante. Les refus sont toujours proposés sans justification
(« Passer », « Pas pour nous »).
