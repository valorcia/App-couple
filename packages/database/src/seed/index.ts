/**
 * Données de démonstration (hors production). Idempotent : upsert par code/texte.
 * Usage : pnpm db:seed  (refuse de s'exécuter si NODE_ENV=production sans SEED_ALLOW_PRODUCTION=true)
 */
import argon2 from 'argon2';
import { PrismaClient, type Prisma } from '@prisma/client';
import { categories } from './content/categories';
import { questions } from './content/questions';
import { challenges } from './content/challenges';
import { desireItems } from './content/desires';
import { activityIdeas } from './content/activities';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_ALLOW_PRODUCTION !== 'true') {
    throw new Error('Seed refusé en production (SEED_ALLOW_PRODUCTION=true pour forcer le catalogue uniquement).');
  }
  const includeDemoAccounts = process.env.NODE_ENV !== 'production';

  // --- Produits (prix configurables ensuite dans l'admin) ---
  for (const p of [
    { code: 'premium_monthly', type: 'SUBSCRIPTION' as const, name: 'Premium Couple — mensuel', priceCents: 499, interval: 'MONTH' as const, entitlementKey: 'premium', sortOrder: 1 },
    { code: 'premium_yearly', type: 'SUBSCRIPTION' as const, name: 'Premium Couple — annuel', priceCents: 2999, interval: 'YEAR' as const, entitlementKey: 'premium', sortOrder: 2 },
  ]) {
    await prisma.product.upsert({ where: { code: p.code }, create: p, update: { name: p.name, interval: p.interval, entitlementKey: p.entitlementKey, sortOrder: p.sortOrder } });
  }

  // --- Catégories ---
  const categoryIds = new Map<string, string>();
  for (const c of categories) {
    const row = await prisma.contentCategory.upsert({ where: { code: c.code }, create: c, update: { name: c.name, description: c.description, icon: c.icon, gameTypes: c.gameTypes, sortOrder: c.sortOrder } });
    categoryIds.set(c.code, row.id);
  }

  // --- Questions (clé d'idempotence : gameType + texte) ---
  let qCount = 0;
  for (const q of questions) {
    const existing = await prisma.question.findFirst({ where: { gameType: q.gameType, text: q.text, locale: 'fr' }, select: { id: true } });
    const data = { gameType: q.gameType, categoryId: categoryIds.get(q.category) ?? null, level: q.level ?? 1, tier: q.tier ?? 'FREE', text: q.text, payload: (q.payload ?? {}) as Prisma.InputJsonValue, tags: q.tags ?? [], locale: 'fr', status: 'PUBLISHED' as const };
    if (existing) await prisma.question.update({ where: { id: existing.id }, data });
    else await prisma.question.create({ data });
    qCount++;
  }

  // --- Défis ---
  let cCount = 0;
  for (const c of challenges) {
    const existing = await prisma.challenge.findFirst({ where: { title: c.title, locale: 'fr' }, select: { id: true } });
    const { category, ...rest } = c;
    const data = { ...rest, categoryId: categoryIds.get(category) ?? null, locale: 'fr', status: 'PUBLISHED' as const };
    if (existing) await prisma.challenge.update({ where: { id: existing.id }, data });
    else await prisma.challenge.create({ data });
    cCount++;
  }

  // --- Envies (Double Secret) ---
  let dCount = 0;
  for (const d of desireItems) {
    const existing = await prisma.desireItem.findFirst({ where: { text: d.text, locale: 'fr' }, select: { id: true } });
    const data = { ...d, locale: 'fr', status: 'PUBLISHED' as const };
    if (existing) await prisma.desireItem.update({ where: { id: existing.id }, data });
    else await prisma.desireItem.create({ data });
    dCount++;
  }

  // --- Idées d'activités (« On fait quoi ? ») ---
  let aCount = 0;
  for (const a of activityIdeas) {
    const existing = await prisma.activityIdea.findFirst({ where: { title: a.title, locale: 'fr' }, select: { id: true } });
    const data = { ...a, locale: 'fr', status: 'PUBLISHED' as const };
    if (existing) await prisma.activityIdea.update({ where: { id: existing.id }, data });
    else await prisma.activityIdea.create({ data });
    aCount++;
  }

  // --- Flags par défaut ---
  for (const f of [
    { key: 'intimacy.module', description: 'Active l’espace Intimité & séduction (opt-in individuel ensuite).', enabled: true },
    { key: 'ai.assistant', description: 'Active l’assistant IA (nécessite AI_PROVIDER configuré).', enabled: false },
    { key: 'billing.stripe', description: 'Active le paiement web Stripe.', enabled: false },
  ]) {
    await prisma.featureFlag.upsert({ where: { key: f.key }, create: f, update: { description: f.description } });
  }

  // --- Comptes de démonstration (jamais en production) ---
  if (includeDemoAccounts) {
    const password = await argon2.hash('Demo!EntreNous2026', { type: argon2.argon2id });
    const admin = await prisma.user.upsert({
      where: { email: 'admin@demo.local' },
      create: { email: 'admin@demo.local', passwordHash: password, role: 'ADMIN', emailVerifiedAt: new Date(), profile: { create: { displayName: 'Admin démo' } } },
      update: { role: 'ADMIN' },
    });
    const alex = await prisma.user.upsert({
      where: { email: 'alex@demo.local' },
      create: { email: 'alex@demo.local', passwordHash: password, emailVerifiedAt: new Date(), adultConfirmedAt: new Date(), profile: { create: { displayName: 'Alex', interests: ['randonnée', 'cinéma', 'cuisine'] } } },
      update: {},
    });
    const camille = await prisma.user.upsert({
      where: { email: 'camille@demo.local' },
      create: { email: 'camille@demo.local', passwordHash: password, emailVerifiedAt: new Date(), adultConfirmedAt: new Date(), profile: { create: { displayName: 'Camille', interests: ['lecture', 'voyages', 'jeux de société'] } } },
      update: {},
    });
    const linked = await prisma.coupleMembership.findFirst({ where: { userId: alex.id, leftAt: null } });
    if (!linked) {
      await prisma.couple.create({
        data: {
          status: 'ACTIVE',
          name: 'Alex & Camille',
          metAt: new Date('2021-05-14'),
          activatedAt: new Date(),
          memberships: { create: [{ userId: alex.id }, { userId: camille.id }] },
          calendars: { create: { kind: 'COUPLE', name: 'Notre agenda' } },
        },
      });
    }
    console.log(`Comptes démo : admin@demo.local, alex@demo.local, camille@demo.local (mot de passe : Demo!EntreNous2026) — admin id ${admin.id}`);
  }

  console.log(`Seed terminé : ${categories.length} catégories, ${qCount} questions, ${cCount} défis, ${dCount} envies, ${aCount} idées d'activités.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
