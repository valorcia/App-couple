# SECURITY — Entre Nous

## 1. Modèle de menaces (résumé)
| Menace | Impact | Mesures |
| --- | --- | --- |
| Partenaire qui tente de lire les données privées de l'autre (événements privés, réponses non révélées, envies non partagées, conversations IA personnelles) | Très élevé (confiance, sécurité physique) | Projections serveur, DTO explicites, tests d'autorisation, aucune donnée brute dans les réponses |
| Fuite de données intimes (base, logs, sauvegardes, fournisseur IA) | Très élevé | Chiffrement au repos, logs sans contenu, pas d'entraînement tiers, minimisation |
| Accès cross-couple (IDOR) | Élevé | `coupleId` dérivé du contexte authentifié, index/contraintes, tests |
| Prise de contrôle de compte | Élevé | argon2id, rotation refresh, détection de réutilisation, rate limit, alertes e-mail |
| Abus IA (injection de prompt, coûts) | Moyen | Données en « data », schémas de sortie, quotas, modération |
| Administrateur malveillant / compromis | Élevé | Rôles, 2FA, audit, pas d'accès aux contenus intimes |
| Paiement contourné | Moyen | Entitlements calculés uniquement par webhooks vérifiés |
| Harcèlement via invitation | Moyen | Code à usage unique, expiration 72 h, limite d'envois, refus/blocage |

## 2. Authentification
- Mots de passe : argon2id (m=64 Mo, t=3, p=4), longueur ≥ 10, vérification contre une
  liste de mots de passe compromis (Phase 5, k-anonymity HIBP).
- Jetons : access JWT 15 min (HS256, secret ≥ 256 bits, rotation prévue), refresh opaque
  30 jours avec rotation et famille de jetons ; révocation globale via `sessionVersion`.
- Vérification e-mail obligatoire pour créer/rejoindre un couple.
- Réinitialisation de mot de passe par jeton haché, 30 min, usage unique, invalide les
  sessions.
- OAuth Apple/Google (Phase 5) : PKCE, vérification des `nonce`, liaison de compte
  uniquement après e-mail vérifié.
- Admin : rôle + TOTP obligatoire (Phase 5), IP allow-list optionnelle, sessions courtes.

## 3. Autorisation
- Guards NestJS : `JwtAuthGuard`, `CoupleGuard`, `RolesGuard`, `EntitlementGuard`.
- Principe : **deny by default**. Chaque contrôleur déclare explicitement sa portée.
- Les ressources renvoyées passent par des mappers de sortie (jamais l'entité Prisma brute).

## 4. Protection applicative
- Validation zod sur toutes les entrées (corps, requête, paramètres), limites de taille.
- Helmet, CORS allow-list, `Content-Security-Policy` stricte sur web/admin.
- XSS : React échappe par défaut ; contenu riche interdit (texte brut + Markdown limité
  rendu via sanitizer).
- Injections SQL : Prisma paramétré ; le SQL brut (index partiels, intersections) est
  paramétré via `$queryRaw` tagué.
- CSRF : API sans cookie sauf `/auth/refresh` (SameSite=Lax + en-tête personnalisé +
  vérification `Origin`).
- Rate limiting : Redis, par IP et par compte (login 5/min, invitation 3/h, IA selon plan).
- Uploads : types MIME autorisés, taille max, URL présignées courtes, scan antivirus
  optionnel (Phase 5), EXIF nettoyé.
- Secrets : variables d'environnement uniquement, validées au démarrage, jamais dans le
  dépôt ; `.env.example` documente chaque variable.

## 5. Chiffrement
- En transit : TLS 1.2+ partout (HSTS).
- Au repos : disques chiffrés (fournisseur) **et** chiffrement applicatif AES-256-GCM
  (clé `DATA_ENCRYPTION_KEY`, rotation par `keyId`) pour : jetons OAuth calendrier,
  contenu des `AIMessage`, `Answer.payload` des catégories Intimité, `Surprise.details`.
- Hachage (SHA-256) des jetons (refresh, invitation, vérification, reset).

## 6. RGPD
- Base légale : exécution du contrat (service), consentement (intimité, IA sur souvenirs,
  marketing), intérêt légitime (sécurité).
- `ConsentRecord` versionné : CGU, confidentialité, intimité, IA-souvenirs, marketing.
- Droits : export (`DataExportRequest` → archive JSON + médias, lien signé 7 jours),
  suppression (`AccountDeletionRequest`, délai de rétractation 30 jours), rectification
  (profil), opposition (notifications marketing).
- Données de santé/vie sexuelle (art. 9) : module Intimité désactivé par défaut, double
  opt-in, chiffrement applicatif, exclusion de toute analytique, **AIPD à rédiger avant
  la mise en production du module** (`docs/DPIA.md`, Phase 5).
- Mineurs : service réservé aux 18 ans et plus (CGU) ; l'espace Intimité exige en plus une
  confirmation explicite de majorité datée.
- Sous-traitants : liste tenue dans `docs/PROCESSORS.md` (hébergeur, Stripe, RevenueCat,
  fournisseur IA, e-mail, push). Fournisseur IA configuré avec options « pas de
  conservation / pas d'entraînement ». Hébergement UE privilégié.
- Analytics : outil respectueux (sans cookies tiers, agrégé) ; aucune donnée intime ni
  contenu de réponses dans les événements d'analytique.
- Aucun SDK publicitaire.

## 7. Journalisation et supervision
- Logs JSON (pino) avec `requestId`, `userId` hashé ; **jamais** de corps de requête des
  routes sensibles (`/games/*/answers`, `/intimacy/*`, `/ai/*`, `/auth/*`).
- `AuditLog` pour toute action admin et toute action sensible utilisateur (changement
  d'e-mail, suppression, export, révocation de consentement, sortie du couple).
- Alertes : pics d'erreurs 401/403, échecs de webhooks, dépassement de coûts IA.

## 8. Notifications
Le contenu push est générique pour les catégories sensibles (« Une nouvelle activité vous
attend » plutôt que le titre d'une envie). Les détails se chargent dans l'app après
authentification.

## 9. Séparation et sécurité des personnes
- Quitter un couple est immédiat et unilatéral ; l'autre partenaire est notifié sans
  détail.
- Aucune fonctionnalité de localisation en temps réel du partenaire.
- Les événements « Occupé » ne révèlent ni lieu ni titre.
- Possibilité de masquer l'application derrière un code PIN (mobile, Phase 4).

## 10. Processus
- Dépendances : `pnpm audit` en CI, Renovate.
- Revue de sécurité à chaque phase ; test d'intrusion externe avant lancement public.
- Divulgation responsable : `SECURITY.md` à la racine avec adresse de contact (à créer
  avec le domaine).
