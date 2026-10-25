import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { auth, bootTestApp, createCouple, resetDb, type TestContext } from './helpers';

const STRIPE_SECRET = 'sk_test_dummy_key_for_signature_only';
const WEBHOOK_SECRET = 'whsec_test_secret';
const RC_SECRET = 'rc_test_secret';

describe('Abonnements', () => {
  let ctx: TestContext;
  let couple: Awaited<ReturnType<typeof createCouple>>;
  const stripe = new Stripe(STRIPE_SECRET);

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = STRIPE_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.REVENUECAT_WEBHOOK_SECRET = RC_SECRET;
    ctx = await bootTestApp();
    await resetDb(ctx.prisma);
    await ctx.prisma.product.createMany({
      data: [
        { code: 'premium_monthly', type: 'SUBSCRIPTION', name: 'Mensuel', priceCents: 499, interval: 'MONTH', entitlementKey: 'premium', stripePriceId: 'price_month', appleProductId: 'en_premium_month', googleProductId: 'en_premium_month' },
        { code: 'premium_yearly', type: 'SUBSCRIPTION', name: 'Annuel', priceCents: 2999, interval: 'YEAR', entitlementKey: 'premium', stripePriceId: 'price_year' },
        { code: 'pack_soirees', type: 'PACK', name: 'Pack soirées', priceCents: 399, entitlementKey: 'pack:soirees', stripePriceId: 'price_pack', appleProductId: 'en_pack_soirees' },
      ],
    });
    couple = await createCouple(ctx);
  });
  afterAll(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.REVENUECAT_WEBHOOK_SECRET;
    await ctx.close();
  });

  const signed = (payload: unknown) => {
    const body = JSON.stringify(payload);
    const header = stripe.webhooks.generateTestHeaderString({ payload: body, secret: WEBHOOK_SECRET });
    return ctx.http().post('/webhooks/stripe').set('stripe-signature', header).set('Content-Type', 'application/json').send(body);
  };
  const stripeSub = (overrides: Record<string, unknown> = {}) => ({
    id: 'sub_123', object: 'subscription', customer: 'cus_123', status: 'active', cancel_at_period_end: false, canceled_at: null, trial_end: null,
    metadata: { coupleId: couple.coupleId, userId: couple.a.userId, productCode: 'premium_monthly' },
    items: { data: [{ price: { id: 'price_month' }, current_period_start: Math.floor(Date.now() / 1000), current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400 }] },
    ...overrides,
  });

  it('expose les offres et un statut sans abonnement', async () => {
    const products = await ctx.http().get('/billing/products');
    expect(products.status).toBe(200);
    expect(products.body.map((p: { code: string; checkoutAvailable: boolean }) => [p.code, p.checkoutAvailable]).sort()).toEqual([['pack_soirees', true], ['premium_monthly', true], ['premium_yearly', true]]);
    const status = await ctx.http().get('/billing/status').set(auth(couple.a.accessToken));
    expect(status.body).toMatchObject({ premium: false, subscription: null, checkoutAvailable: true });
  });

  it('refuse un webhook Stripe mal signé et accepte un webhook signé (idempotent)', async () => {
    const bad = await ctx.http().post('/webhooks/stripe').set('stripe-signature', 't=1,v1=bad').set('Content-Type', 'application/json').send(JSON.stringify({ id: 'evt_x', type: 'ping' }));
    expect(bad.status).toBe(400);

    const created = await signed({ id: 'evt_1', type: 'customer.subscription.created', data: { object: stripeSub() } });
    expect(created.status).toBe(200);
    expect(created.body).toEqual({ received: true, handled: true });
    const status = await ctx.http().get('/billing/status').set(auth(couple.b.accessToken));
    expect(status.body.premium).toBe(true);
    expect(status.body.subscription).toMatchObject({ provider: 'STRIPE', status: 'ACTIVE', productCode: 'premium_monthly', manageVia: 'stripe' });
    expect(status.body.entitlements).toEqual(['premium']);

    // Rejeu du même événement : ignoré.
    const replay = await signed({ id: 'evt_1', type: 'customer.subscription.created', data: { object: stripeSub() } });
    expect(replay.body).toEqual({ received: true, handled: false });

    // Le droit vaut pour les deux partenaires : le catalogue de jeux devient premium.
    const catalog = await ctx.http().get('/games/catalog').set(auth(couple.a.accessToken));
    expect(catalog.body.premium).toBe(true);
  });

  it('gère l\'échec de paiement, l\'annulation en fin de période et la suppression', async () => {
    const failed = await signed({ id: 'evt_2', type: 'invoice.payment_failed', data: { object: { id: 'in_1', object: 'invoice', parent: { subscription_details: { subscription: 'sub_123' } } } } });
    expect(failed.body.handled).toBe(true);
    let status = await ctx.http().get('/billing/status').set(auth(couple.a.accessToken));
    expect(status.body.subscription.status).toBe('PAST_DUE');
    expect(status.body.premium).toBe(true); // accès conservé pendant la période de grâce
    const notif = await ctx.http().get('/notifications').set(auth(couple.a.accessToken));
    expect(notif.body.items.some((n: { type: string }) => n.type === 'billing.payment_failed')).toBe(true);

    await signed({ id: 'evt_3', type: 'customer.subscription.updated', data: { object: stripeSub({ cancel_at_period_end: true }) } });
    status = await ctx.http().get('/billing/status').set(auth(couple.a.accessToken));
    expect(status.body.subscription).toMatchObject({ status: 'ACTIVE', cancelAtPeriodEnd: true });

    await signed({ id: 'evt_4', type: 'customer.subscription.deleted', data: { object: stripeSub({ status: 'canceled', canceled_at: Math.floor(Date.now() / 1000) }) } });
    status = await ctx.http().get('/billing/status').set(auth(couple.a.accessToken));
    expect(status.body).toMatchObject({ premium: false, subscription: null });
    expect(await ctx.prisma.entitlement.count({ where: { coupleId: couple.coupleId } })).toBe(0);
  });

  it('accorde un pack permanent via checkout.session.completed en mode paiement', async () => {
    const res = await signed({ id: 'evt_5', type: 'checkout.session.completed', data: { object: { id: 'cs_1', object: 'checkout.session', mode: 'payment', client_reference_id: couple.coupleId, payment_intent: 'pi_1', amount_total: 399, currency: 'eur', metadata: { coupleId: couple.coupleId, userId: couple.b.userId, productCode: 'pack_soirees' } } } });
    expect(res.body.handled).toBe(true);
    const status = await ctx.http().get('/billing/status').set(auth(couple.a.accessToken));
    expect(status.body.entitlements).toEqual(['pack:soirees']);
    expect(await ctx.prisma.purchase.count({ where: { coupleId: couple.coupleId, status: 'COMPLETED' } })).toBe(1);
  });

  it('traite les webhooks RevenueCat (achat, expiration) pour le couple de l\'utilisateur mobile', async () => {
    const fresh = await createCouple(ctx);
    const unauth = await ctx.http().post('/webhooks/revenuecat').send({ event: { id: 'rc_0', type: 'INITIAL_PURCHASE', app_user_id: fresh.a.userId, product_id: 'en_premium_month' } });
    expect(unauth.status).toBe(401);
    const exp = Date.now() + 30 * 86_400_000;
    const purchase = await ctx.http().post('/webhooks/revenuecat').set('Authorization', `Bearer ${RC_SECRET}`).send({ event: { id: 'rc_1', type: 'INITIAL_PURCHASE', app_user_id: fresh.a.userId, product_id: 'en_premium_month', store: 'APP_STORE', expiration_at_ms: exp, original_transaction_id: 'otx_1', transaction_id: 'tx_1', price: 4.99, currency: 'EUR' } });
    expect(purchase.status).toBe(200);
    expect(purchase.body.handled).toBe(true);
    let status = await ctx.http().get('/billing/status').set(auth(fresh.b.accessToken));
    expect(status.body).toMatchObject({ premium: true });
    expect(status.body.subscription).toMatchObject({ provider: 'APPLE', status: 'ACTIVE', manageVia: 'apple' });

    // Checkout web refusé quand un abonnement est déjà actif ; portail indisponible (pas de client Stripe).
    const dup = await ctx.http().post('/billing/checkout').set(auth(fresh.a.accessToken)).send({ productCode: 'premium_monthly' });
    expect(dup.status).toBe(409);
    const portal = await ctx.http().post('/billing/portal').set(auth(fresh.a.accessToken)).send({});
    expect(portal.body.code).toBe('BILLING_NO_CUSTOMER');

    await ctx.http().post('/webhooks/revenuecat').set('Authorization', `Bearer ${RC_SECRET}`).send({ event: { id: 'rc_2', type: 'EXPIRATION', app_user_id: fresh.a.userId, product_id: 'en_premium_month', store: 'APP_STORE', expiration_at_ms: Date.now() - 1000, original_transaction_id: 'otx_1' } });
    status = await ctx.http().get('/billing/status').set(auth(fresh.b.accessToken));
    expect(status.body).toMatchObject({ premium: false, subscription: null });

    // Pack non renouvelable → droit permanent.
    await ctx.http().post('/webhooks/revenuecat').set('Authorization', `Bearer ${RC_SECRET}`).send({ event: { id: 'rc_3', type: 'NON_RENEWING_PURCHASE', app_user_id: fresh.b.userId, product_id: 'en_pack_soirees', store: 'APP_STORE', transaction_id: 'tx_pack', price: 3.99, currency: 'EUR' } });
    status = await ctx.http().get('/billing/status').set(auth(fresh.a.accessToken));
    expect(status.body.entitlements).toEqual(['pack:soirees']);
  });

  it('expose les abonnements et le MRR à l\'administration', async () => {
    const admin = await createCouple(ctx);
    await ctx.prisma.user.update({ where: { id: admin.a.userId }, data: { role: 'ADMIN' } });
    const list = await ctx.http().get('/admin/subscriptions').set(auth(admin.a.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.items.length).toBeGreaterThanOrEqual(2);
    const stats = await ctx.http().get('/admin/stats').set(auth(admin.a.accessToken));
    expect(stats.body.mrrCents).toBeGreaterThanOrEqual(0);
    expect(typeof stats.body.activeSubscriptions).toBe('number');
  });
});
