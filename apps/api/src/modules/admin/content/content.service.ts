import { Injectable } from '@nestjs/common';
import { Prisma } from '@couple/database';
import { AppError, ErrorCode } from '@couple/shared';
import type { z } from 'zod';
import {
  adminActivitySchema,
  adminCardSchema,
  adminCategorySchema,
  adminChallengeSchema,
  adminContentListSchema,
  adminDesireSchema,
  adminPackSchema,
  adminQuestionSchema,
  type ContentType,
} from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import { AuditService } from '@/common/audit/audit.service';

interface Actor {
  id: string;
  role: string;
  ip?: string | null;
}

type ListInput = z.infer<typeof adminContentListSchema>;

/**
 * CMS des contenus : questions, défis, envies, idées d'activités, catégories, packs.
 * Chaque écriture est journalisée. Le contenu en DRAFT n'est jamais servi aux joueurs
 * (les services métier filtrent sur PUBLISHED).
 */
@Injectable()
export class ContentAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ------------------------------------------------------------------ lecture
  async list(type: ContentType, input: ListInput) {
    const take = input.limit + 1;
    const cursor: { cursor?: { id: string }; skip?: number } = input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {};
    const text = input.q ? { contains: input.q, mode: 'insensitive' as const } : undefined;
    let rows: ({ id: string } & Record<string, unknown>)[];
    switch (type) {
      case 'questions':
        rows = await this.prisma.question.findMany({
          where: { ...(text ? { text } : {}), status: input.status, tier: input.tier, locale: input.locale, gameType: input.gameType, ...(input.categoryCode ? { category: { code: input.categoryCode } } : {}) },
          include: { category: { select: { code: true, name: true } }, pack: { select: { code: true } } },
          orderBy: { id: 'desc' }, take, ...cursor,
        });
        break;
      case 'challenges':
        rows = await this.prisma.challenge.findMany({
          where: { ...(text ? { title: text } : {}), status: input.status, tier: input.tier, locale: input.locale, ...(input.categoryCode ? { category: { code: input.categoryCode } } : {}) },
          include: { category: { select: { code: true, name: true } }, pack: { select: { code: true } } },
          orderBy: { id: 'desc' }, take, ...cursor,
        });
        break;
      case 'desires':
        rows = await this.prisma.desireItem.findMany({ where: { ...(text ? { text } : {}), status: input.status, tier: input.tier, locale: input.locale, category: input.categoryCode }, include: { pack: { select: { code: true } } }, orderBy: { id: 'desc' }, take, ...cursor });
        break;
      case 'cards':
        rows = await this.prisma.intimacyCard.findMany({ where: { ...(text ? { text } : {}), status: input.status, tier: input.tier, locale: input.locale }, orderBy: [{ level: 'asc' }, { id: 'desc' }], take, ...cursor });
        break;
      case 'activities':
        rows = await this.prisma.activityIdea.findMany({ where: { ...(text ? { title: text } : {}), status: input.status, tier: input.tier, locale: input.locale }, orderBy: { id: 'desc' }, take, ...cursor });
        break;
      case 'categories':
        rows = await this.prisma.contentCategory.findMany({ where: { ...(text ? { name: text } : {}), status: input.status }, orderBy: { sortOrder: 'asc' }, take, ...cursor });
        break;
      case 'packs':
        rows = await this.prisma.contentPack.findMany({ where: { ...(text ? { name: text } : {}), status: input.status }, include: { product: { select: { code: true } }, _count: { select: { questions: true, challenges: true, desireItems: true, missions: true } } }, orderBy: { id: 'desc' }, take, ...cursor });
        break;
    }
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    return { items, nextCursor: hasMore ? items[items.length - 1]!.id : null };
  }

  async counts() {
    const [questions, challenges, desires, cards, activities, categories, packs] = await Promise.all([
      this.prisma.question.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.challenge.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.desireItem.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.intimacyCard.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.activityIdea.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.contentCategory.count(),
      this.prisma.contentPack.count(),
    ]);
    const fold = (g: { status: string; _count: { _all: number } }[]) => Object.fromEntries(g.map((x) => [x.status, x._count._all]));
    return { questions: fold(questions), challenges: fold(challenges), desires: fold(desires), cards: fold(cards), activities: fold(activities), categories, packs };
  }

  // ------------------------------------------------------------------ écriture
  async upsert(actor: Actor, type: ContentType, id: string | null, body: unknown) {
    let row: { id: string };
    switch (type) {
      case 'questions': {
        const d = parse(adminQuestionSchema, body);
        const data = { gameType: d.gameType, categoryId: await this.categoryId(d.categoryCode), packId: await this.packId(d.packCode), locale: d.locale, level: d.level, tier: d.tier, status: d.status, text: d.text, payload: (d.options ? { options: d.options } : {}) as Prisma.InputJsonValue, tags: d.tags };
        row = id ? await this.prisma.question.update({ where: { id }, data }) : await this.prisma.question.create({ data });
        break;
      }
      case 'challenges': {
        const d = parse(adminChallengeSchema, body);
        const { categoryCode, packCode, ...rest } = d;
        const data = { ...rest, categoryId: await this.categoryId(categoryCode), packId: await this.packId(packCode) };
        row = id ? await this.prisma.challenge.update({ where: { id }, data }) : await this.prisma.challenge.create({ data });
        break;
      }
      case 'desires': {
        const d = parse(adminDesireSchema, body);
        const { packCode, ...rest } = d;
        const data = { ...rest, packId: await this.packId(packCode) };
        row = id ? await this.prisma.desireItem.update({ where: { id }, data }) : await this.prisma.desireItem.create({ data });
        break;
      }
      case 'cards': {
        const d = parse(adminCardSchema, body);
        row = id ? await this.prisma.intimacyCard.update({ where: { id }, data: d }) : await this.prisma.intimacyCard.create({ data: d });
        break;
      }
      case 'activities': {
        const d = parse(adminActivitySchema, body);
        row = id ? await this.prisma.activityIdea.update({ where: { id }, data: d }) : await this.prisma.activityIdea.create({ data: d });
        break;
      }
      case 'categories': {
        const d = parse(adminCategorySchema, body);
        row = id ? await this.prisma.contentCategory.update({ where: { id }, data: d }) : await this.prisma.contentCategory.upsert({ where: { code: d.code }, create: d, update: d });
        break;
      }
      case 'packs': {
        const d = parse(adminPackSchema, body);
        const { productCode, ...rest } = d;
        const product = productCode ? await this.prisma.product.findUnique({ where: { code: productCode } }) : null;
        if (productCode && !product) throw AppError.notFound('Produit introuvable.');
        const data = { ...rest, productId: product?.id ?? null };
        row = id ? await this.prisma.contentPack.update({ where: { id }, data }) : await this.prisma.contentPack.upsert({ where: { code: d.code }, create: data, update: data });
        break;
      }
    }
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: `admin.content.${id ? 'update' : 'create'}`, targetType: type, targetId: row.id, ip: actor.ip });
    return this.getOne(type, row.id);
  }

  async setStatus(actor: Actor, type: ContentType, id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') {
    const model = this.model(type);
    await (model as { update: (args: unknown) => Promise<unknown> }).update({ where: { id }, data: { status } });
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.content.status', targetType: type, targetId: id, metadata: { status }, ip: actor.ip });
    return this.getOne(type, id);
  }

  async remove(actor: Actor, type: ContentType, id: string) {
    // Suppression physique réservée aux brouillons ; sinon archivage (les parties jouées référencent les questions).
    const row = (await this.getOne(type, id)) as { status?: string } | null;
    if (!row) throw AppError.notFound('Contenu introuvable.');
    if (row.status && row.status !== 'DRAFT') return this.setStatus(actor, type, id, 'ARCHIVED');
    const model = this.model(type);
    await (model as { delete: (args: unknown) => Promise<unknown> }).delete({ where: { id } });
    await this.audit.log({ actorUserId: actor.id, actorRole: actor.role, action: 'admin.content.delete', targetType: type, targetId: id, ip: actor.ip });
    return null;
  }

  /** Import en masse (JSON) : chaque élément est validé ; les erreurs sont renvoyées par index sans bloquer les autres. */
  async import(actor: Actor, type: ContentType, items: Record<string, unknown>[]) {
    const results: { index: number; id?: string; error?: string }[] = [];
    for (let i = 0; i < items.length; i++) {
      try {
        const row = (await this.upsert(actor, type, null, items[i])) as { id: string };
        results.push({ index: i, id: row.id });
      } catch (e) {
        results.push({ index: i, error: e instanceof AppError ? `${e.message} ${JSON.stringify(e.details ?? '')}` : (e as Error).message });
      }
    }
    return { imported: results.filter((r) => r.id).length, failed: results.filter((r) => r.error).length, results };
  }

  async getOne(type: ContentType, id: string): Promise<unknown> {
    switch (type) {
      case 'questions':
        return this.prisma.question.findUnique({ where: { id }, include: { category: { select: { code: true, name: true } }, pack: { select: { code: true } } } });
      case 'challenges':
        return this.prisma.challenge.findUnique({ where: { id }, include: { category: { select: { code: true, name: true } }, pack: { select: { code: true } } } });
      case 'desires':
        return this.prisma.desireItem.findUnique({ where: { id }, include: { pack: { select: { code: true } } } });
      case 'cards':
        return this.prisma.intimacyCard.findUnique({ where: { id } });
      case 'activities':
        return this.prisma.activityIdea.findUnique({ where: { id } });
      case 'categories':
        return this.prisma.contentCategory.findUnique({ where: { id } });
      case 'packs':
        return this.prisma.contentPack.findUnique({ where: { id }, include: { product: { select: { code: true } } } });
    }
  }

  // ------------------------------------------------------------------ internes
  private model(type: ContentType) {
    return { questions: this.prisma.question, challenges: this.prisma.challenge, desires: this.prisma.desireItem, cards: this.prisma.intimacyCard, activities: this.prisma.activityIdea, categories: this.prisma.contentCategory, packs: this.prisma.contentPack }[type];
  }
  private async categoryId(code: string | null | undefined): Promise<string | null> {
    if (!code) return null;
    const c = await this.prisma.contentCategory.findUnique({ where: { code } });
    if (!c) throw new AppError(ErrorCode.VALIDATION_FAILED, `Catégorie inconnue : ${code}`, 400, [{ path: 'categoryCode' }]);
    return c.id;
  }
  private async packId(code: string | null | undefined): Promise<string | null> {
    if (!code) return null;
    const p = await this.prisma.contentPack.findUnique({ where: { code } });
    if (!p) throw new AppError(ErrorCode.VALIDATION_FAILED, `Pack inconnu : ${code}`, 400, [{ path: 'packCode' }]);
    return p.id;
  }
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body ?? {});
  if (!r.success) throw new AppError(ErrorCode.VALIDATION_FAILED, 'Certaines informations sont invalides.', 400, r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })));
  return r.data;
}
