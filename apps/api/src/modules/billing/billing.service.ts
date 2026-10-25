import { Inject, Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { type PaymentProvider, Prisma, type SubscriptionStatus } from '@couple/database';
import { AppError, ENTITLEMENT, ErrorCode } from '@couple/shared';
import type { BillingProductDto, BillingStatusDto, CheckoutSessionDto } from '@couple/types';
import { ENV, type Env } from '@/config/env';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

/** Marge accordée après la fin de période (relances de paiement) avant de retirer le droit. */
const GRACE_MS = 3 * 86_400_000;

/**
 * Abonnements : Stripe (web) et RevenueCat (iOS/Android) alimentent `Subscription`, `Purchase` et
 * les `Entitlement` du couple via des webhooks vérifiés et idempotents. Aucun paiement n'est jamais
 * simulé : sans clés, le checkout est indisponible (503) et le client l'affiche tel quel.
 */
@Injectable()
export class BillingService {
  readonly stripe: Stripe | null;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeGateway,
  ) {
    this.stripe = env.STRIPE_SECRET_KEY ? new Stripe(env.STRIPE_SECRET_KEY) : null;
  }

  get checkoutAvailable(): boolean {
    return this.stripe !== null;
  }

  // ------------------------------------------------------------------ lecture
  async products(): Promise<BillingProductDto[]> {
    const rows = await this.prisma.product.findMany({ where: { active: true }, orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }] });
    return rows.map((p) => ({
      id: p.id, code: p.code, type: p.type, name: p.name, description: p.description, priceCents: p.priceCents, currency: p.currency, interval: p.interval, entitlementKey: p.entitlementKey, active: p.active,
      checkoutAvailable: this.checkoutAvailable && !!p.stripePriceId,
    }));
  }

  async status(viewer: Viewer): Promise<BillingStatusDto> {
    const sub = await this.prisma.subscription.findFirst({
      where: { coupleId: viewer.couple.coupleId, status: { in: ['TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED'] } },
      orderBy: { updatedAt: 'desc' },
      include: { product: { select: { code: true } } },
    });
    const keys = await this.entitlements.listKeys(viewer.couple.coupleId);
    return {
      premium: keys.includes(ENTITLEMENT.PREMIUM),
      entitlements: keys,
      subscription: sub
        ? { provider: sub.provider, status: sub.status, productCode: sub.product?.code ?? null, currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null, cancelAtPeriodEnd: sub.cancelAtPeriodEnd, manageVia: sub.provider === 'STRIPE' ? 'stripe' : sub.provider === 'APPLE' ? 'apple' : sub.provider === 'GOOGLE' ? 'google' : 'manual' }
        : null,
      checkoutAvailable: this.checkoutAvailable,
    };
  }

  // ------------------------------------------------------------------ Stripe (web)
  async createCheckout(viewer: Viewer, productCode: string, successPath: string, cancelPath: string): Promise<CheckoutSessionDto> {
    if (!this.stripe) throw new AppError(ErrorCode.BILLING_UNAVAILABLE, "Le paiement n'est pas encore disponible.", 503);
    const product = await this.prisma.product.findFirst({ where: { code: productCode, active: true } });
    if (!product || !product.stripePriceId) throw AppError.notFound('Offre introuvable.');
    const already = await this.prisma.subscription.findFirst({ where: { coupleId: viewer.couple.coupleId, status: { in: ['ACTIVE', 'TRIALING', 'PAST_DUE'] } } });
    if (product.type === 'SUBSCRIPTION' && already) throw AppError.conflict(ErrorCode.CONFLICT, 'Votre couple dispose déjà d’un abonnement actif.');
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: viewer.userId }, select: { email: true } });
    const existingCustomer = await this.prisma.subscription.findFirst({ where: { coupleId: viewer.couple.coupleId, provider: 'STRIPE', providerCustomerId: { not: null } }, select: { providerCustomerId: true } });
    const session = await this.stripe.checkout.sessions.create({
      mode: product.type === 'SUBSCRIPTION' ? 'subscription' : 'payment',
      line_items: [{ price: product.stripePriceId, quantity: 1 }],
      success_url: `${this.env.WEB_PUBLIC_URL}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.env.WEB_PUBLIC_URL}${cancelPath}`,
      client_reference_id: viewer.couple.coupleId,
      ...(existingCustomer?.providerCustomerId ? { customer: existingCustomer.providerCustomerId } : { customer_email: user.email }),
      allow_promotion_codes: true,
      locale: 'fr',
      metadata: { coupleId: viewer.couple.coupleId, userId: viewer.userId, productCode: product.code },
      ...(product.type === 'SUBSCRIPTION' ? { subscription_data: { metadata: { coupleId: viewer.couple.coupleId, userId: viewer.userId, productCode: product.code } } } : { payment_intent_data: { metadata: { coupleId: viewer.couple.coupleId, userId: viewer.userId, productCode: product.code } } }),
    });
    if (!session.url) throw new AppError(ErrorCode.INTERNAL, 'Session de paiement indisponible.', 502);
    await this.audit.log({ actorUserId: viewer.userId, action: 'billing.checkout_started', targetType: 'Couple', targetId: viewer.couple.coupleId, metadata: { productCode } });
    return { url: session.url };
  }

  async createPortal(viewer: Viewer, returnPath: string): Promise<CheckoutSessionDto> {
    if (!this.stripe) throw new AppError(ErrorCode.BILLING_UNAVAILABLE, "Le paiement n'est pas encore disponible.", 503);
    const sub = await this.prisma.subscription.findFirst({ where: { coupleId: viewer.couple.coupleId, provider: 'STRIPE', providerCustomerId: { not: null } }, orderBy: { updatedAt: 'desc' } });
    if (!sub?.providerCustomerId) throw new AppError(ErrorCode.BILLING_NO_CUSTOMER, 'Aucun abonnement web à gérer pour ce couple.', 404);
    const session = await this.stripe.billingPortal.sessions.create({ customer: sub.providerCustomerId, return_url: `${this.env.WEB_PUBLIC_URL}${returnPath}` });
    return { url: session.url };
  }

  /** Webhook Stripe : signature vérifiée sur le corps brut, idempotence par identifiant d'événement. */
  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<{ received: true; handled: boolean }> {
    if (!this.stripe || !this.env.STRIPE_WEBHOOK_SECRET) throw new AppError(ErrorCode.BILLING_UNAVAILABLE, 'Webhook Stripe non configuré.', 503);
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature ?? '', this.env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new AppError(ErrorCode.FORBIDDEN, 'Signature Stripe invalide.', 400);
    }
    return this.processWebhook('STRIPE', event.id, event.type, event as unknown as Record<string, unknown>, async () => {
      switch (event.type) {
        case 'checkout.session.completed':
          return this.onCheckoutCompleted(event.data.object);
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          return this.onStripeSubscription(event.data.object);
        case 'invoice.payment_failed':
          return this.onInvoiceFailed(event.data.object);
        default:
          return false;
      }
    });
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<boolean> {
    const coupleId = session.client_reference_id ?? session.metadata?.coupleId;
    if (!coupleId) return false;
    const productCode = session.metadata?.productCode;
    const product = productCode ? await this.prisma.product.findUnique({ where: { code: productCode } }) : null;
    if (session.mode === 'payment' && product?.type === 'PACK') {
      // Achat ponctuel : enregistre l'achat et accorde le droit permanent.
      const txId = typeof session.payment_intent === 'string' ? session.payment_intent : (session.payment_intent?.id ?? session.id);
      await this.prisma.purchase.upsert({
        where: { provider_providerTransactionId: { provider: 'STRIPE', providerTransactionId: txId } },
        create: { coupleId, userId: session.metadata?.userId ?? null, productId: product.id, provider: 'STRIPE', providerTransactionId: txId, amountCents: session.amount_total ?? product.priceCents, currency: (session.currency ?? product.currency).toUpperCase(), status: 'COMPLETED' },
        update: { status: 'COMPLETED' },
      });
      await this.entitlements.grant(coupleId, product.entitlementKey, 'PURCHASE', txId, null);
      await this.afterEntitlementChange(coupleId);
      return true;
    }
    if (session.mode === 'subscription' && typeof session.subscription === 'string') {
      // Lie le client Stripe au couple ; l'état détaillé arrive par customer.subscription.*.
      const customerId = typeof session.customer === 'string' ? session.customer : (session.customer?.id ?? null);
      await this.prisma.subscription.upsert({
        where: { provider_providerSubscriptionId: { provider: 'STRIPE', providerSubscriptionId: session.subscription } },
        create: { coupleId, purchaserUserId: session.metadata?.userId ?? null, productId: product?.id ?? null, provider: 'STRIPE', providerSubscriptionId: session.subscription, providerCustomerId: customerId, status: 'ACTIVE' },
        update: { providerCustomerId: customerId ?? undefined, purchaserUserId: session.metadata?.userId ?? undefined },
      });
      return true;
    }
    return false;
  }

  private async onStripeSubscription(sub: Stripe.Subscription): Promise<boolean> {
    const coupleId = sub.metadata?.coupleId;
    if (!coupleId) return false;
    const productCode = sub.metadata?.productCode;
    const priceId = sub.items.data[0]?.price?.id;
    const product = (productCode ? await this.prisma.product.findUnique({ where: { code: productCode } }) : null) ?? (priceId ? await this.prisma.product.findFirst({ where: { stripePriceId: priceId } }) : null);
    const periodEndSec = (sub as unknown as { current_period_end?: number }).current_period_end ?? sub.items.data[0]?.current_period_end ?? null;
    const periodStartSec = (sub as unknown as { current_period_start?: number }).current_period_start ?? sub.items.data[0]?.current_period_start ?? null;
    const status = mapStripeStatus(sub.status);
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    await this.prisma.subscription.upsert({
      where: { provider_providerSubscriptionId: { provider: 'STRIPE', providerSubscriptionId: sub.id } },
      create: { coupleId, purchaserUserId: sub.metadata?.userId ?? null, productId: product?.id ?? null, provider: 'STRIPE', providerSubscriptionId: sub.id, providerCustomerId: customerId, status, currentPeriodStart: periodStartSec ? new Date(periodStartSec * 1000) : null, currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000) : null, cancelAtPeriodEnd: sub.cancel_at_period_end, canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null, trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null },
      update: { productId: product?.id ?? undefined, providerCustomerId: customerId, status, currentPeriodStart: periodStartSec ? new Date(periodStartSec * 1000) : undefined, currentPeriodEnd: periodEndSec ? new Date(periodEndSec * 1000) : undefined, cancelAtPeriodEnd: sub.cancel_at_period_end, canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : null, trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null },
    });
    await this.syncEntitlement(coupleId, product?.entitlementKey ?? ENTITLEMENT.PREMIUM, status, periodEndSec ? new Date(periodEndSec * 1000) : null, `stripe:${sub.id}`);
    return true;
  }

  private async onInvoiceFailed(invoice: Stripe.Invoice): Promise<boolean> {
    const subId = (invoice as unknown as { subscription?: string | { id: string } | null }).subscription ?? (invoice.parent?.subscription_details?.subscription as string | undefined);
    const id = typeof subId === 'string' ? subId : subId?.id;
    if (!id) return false;
    const sub = await this.prisma.subscription.findUnique({ where: { provider_providerSubscriptionId: { provider: 'STRIPE', providerSubscriptionId: id } } });
    if (!sub) return false;
    await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'PAST_DUE' } });
    const members = await this.prisma.coupleMembership.findMany({ where: { coupleId: sub.coupleId, leftAt: null } });
    for (const m of members) {
      await this.notifications.notify({ userId: m.userId, category: 'SYSTEM', type: 'billing.payment_failed', title: 'Paiement en attente', body: 'Le dernier paiement de votre abonnement a échoué. Mettez à jour votre moyen de paiement.', data: {} });
    }
    return true;
  }

  // ------------------------------------------------------------------ RevenueCat (mobile)
  /**
   * Webhook RevenueCat (Authorization: Bearer <secret>). `app_user_id` = identifiant utilisateur Entre Nous ;
   * le droit est accordé au couple actif de cet utilisateur.
   */
  async handleRevenueCatWebhook(body: unknown, authorization: string | undefined): Promise<{ received: true; handled: boolean }> {
    if (!this.env.REVENUECAT_WEBHOOK_SECRET) throw new AppError(ErrorCode.BILLING_UNAVAILABLE, 'Webhook RevenueCat non configuré.', 503);
    if (authorization !== `Bearer ${this.env.REVENUECAT_WEBHOOK_SECRET}`) throw new AppError(ErrorCode.FORBIDDEN, 'Signature RevenueCat invalide.', 401);
    const event = (body as { event?: RevenueCatEvent })?.event;
    if (!event?.id || !event.type) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Événement RevenueCat invalide.', 400);
    const provider: PaymentProvider = event.store === 'APP_STORE' || event.store === 'MAC_APP_STORE' ? 'APPLE' : 'GOOGLE';
    return this.processWebhook(provider, event.id, event.type, body as Record<string, unknown>, async () => {
      const membership = await this.prisma.coupleMembership.findFirst({ where: { userId: event.app_user_id, leftAt: null }, select: { coupleId: true } });
      if (!membership) return false;
      const coupleId = membership.coupleId;
      const product = await this.prisma.product.findFirst({ where: { OR: [{ appleProductId: event.product_id }, { googleProductId: event.product_id }] } });
      const entitlementKey = product?.entitlementKey ?? ENTITLEMENT.PREMIUM;
      const txId = event.original_transaction_id ?? event.transaction_id ?? event.id;
      const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;

      if (event.type === 'NON_RENEWING_PURCHASE' || product?.type === 'PACK') {
        await this.prisma.purchase.upsert({
          where: { provider_providerTransactionId: { provider, providerTransactionId: event.transaction_id ?? txId } },
          create: { coupleId, userId: event.app_user_id, productId: product?.id ?? (await this.fallbackProductId()), provider, providerTransactionId: event.transaction_id ?? txId, amountCents: Math.round((event.price ?? 0) * 100), currency: (event.currency ?? 'EUR').toUpperCase(), status: 'COMPLETED' },
          update: { status: 'COMPLETED' },
        });
        await this.entitlements.grant(coupleId, entitlementKey, 'PURCHASE', `${provider.toLowerCase()}:${txId}`, null);
        await this.afterEntitlementChange(coupleId);
        return true;
      }

      const status: SubscriptionStatus =
        event.type === 'EXPIRATION' ? 'EXPIRED'
        : event.type === 'CANCELLATION' ? 'ACTIVE' // auto-renouvellement coupé : accès jusqu'à l'expiration
        : event.type === 'BILLING_ISSUE' ? 'PAST_DUE'
        : 'ACTIVE';
      await this.prisma.subscription.upsert({
        where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: txId } },
        create: { coupleId, purchaserUserId: event.app_user_id, productId: product?.id ?? null, provider, providerSubscriptionId: txId, status, currentPeriodEnd: expiresAt, cancelAtPeriodEnd: event.type === 'CANCELLATION' },
        update: { status, currentPeriodEnd: expiresAt ?? undefined, cancelAtPeriodEnd: event.type === 'CANCELLATION' ? true : event.type === 'UNCANCELLATION' ? false : undefined, productId: product?.id ?? undefined },
      });
      await this.syncEntitlement(coupleId, entitlementKey, status, expiresAt, `${provider.toLowerCase()}:${txId}`);
      return true;
    });
  }

  private async fallbackProductId(): Promise<string> {
    const p = await this.prisma.product.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!p) throw new AppError(ErrorCode.NOT_FOUND, 'Aucun produit configuré.', 404);
    return p.id;
  }

  // ------------------------------------------------------------------ communs
  private async processWebhook(provider: PaymentProvider, eventId: string, type: string, payload: Record<string, unknown>, handler: () => Promise<boolean>): Promise<{ received: true; handled: boolean }> {
    try {
      await this.prisma.webhookEvent.create({ data: { provider, eventId, type, payload: payload as Prisma.InputJsonValue } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return { received: true, handled: false }; // déjà traité
      throw e;
    }
    try {
      const handled = await handler();
      await this.prisma.webhookEvent.update({ where: { provider_eventId: { provider, eventId } }, data: { processedAt: new Date() } });
      return { received: true, handled };
    } catch (e) {
      await this.prisma.webhookEvent.update({ where: { provider_eventId: { provider, eventId } }, data: { error: (e as Error).message.slice(0, 500) } });
      throw e;
    }
  }

  private async syncEntitlement(coupleId: string, key: string, status: SubscriptionStatus, periodEnd: Date | null, sourceRef: string) {
    const grants = status === 'ACTIVE' || status === 'TRIALING' || status === 'PAST_DUE';
    if (grants) {
      await this.entitlements.grant(coupleId, key, 'SUBSCRIPTION', sourceRef, periodEnd ? new Date(periodEnd.getTime() + GRACE_MS) : null);
    } else {
      const current = await this.prisma.entitlement.findUnique({ where: { coupleId_key: { coupleId, key } } });
      if (current?.sourceRef === sourceRef) await this.entitlements.revoke(coupleId, key);
    }
    await this.afterEntitlementChange(coupleId);
  }

  private async afterEntitlementChange(coupleId: string) {
    this.realtime.emitToCouple(coupleId, 'entitlements.changed', {});
  }
}

interface RevenueCatEvent {
  id: string;
  type: string;
  app_user_id: string;
  product_id: string;
  store?: string;
  expiration_at_ms?: number | null;
  original_transaction_id?: string;
  transaction_id?: string;
  price?: number;
  currency?: string;
}

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case 'trialing':
      return 'TRIALING';
    case 'active':
      return 'ACTIVE';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'paused':
      return 'PAUSED';
    case 'canceled':
      return 'CANCELED';
    case 'incomplete':
    case 'incomplete_expired':
    default:
      return 'EXPIRED';
  }
}
