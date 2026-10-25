import { Injectable } from '@nestjs/common';
import type { Prisma } from '@couple/database';
import { AppError } from '@couple/shared';
import type { ProjectDto } from '@couple/types';
import type { z } from 'zod';
import type { createProjectSchema, createProjectStepSchema, updateProjectSchema, updateProjectStepSchema } from '@couple/validation';
import { PrismaService } from '@/common/prisma/prisma.service';
import type { CoupleContext } from '@/common/decorators/auth.decorators';
import { RealtimeGateway } from '@/modules/realtime/realtime.gateway';

interface Viewer {
  userId: string;
  couple: CoupleContext;
}

const include = { steps: { orderBy: { position: 'asc' } }, notes: { orderBy: { createdAt: 'desc' } }, _count: { select: { tasks: { where: { status: 'OPEN' } } } } } satisfies Prisma.ProjectInclude;
type Row = Prisma.ProjectGetPayload<{ include: typeof include }>;

/** Étapes proposées par gabarit (modifiables ensuite). */
export const TEMPLATE_STEPS: Record<string, string[]> = {
  house: ['Définir le budget et le financement', 'Lister les critères (lieu, surface, extérieur)', 'Visiter des biens', 'Faire une offre', 'Signer le compromis', 'Obtenir le prêt', 'Signer chez le notaire', 'Emménager'],
  trip: ['Choisir la destination et les dates', 'Fixer le budget', 'Réserver les transports', 'Réserver les hébergements', 'Préparer l’itinéraire', 'Vérifier papiers et assurances', 'Faire les valises'],
  wedding: ['Fixer la date et le budget', 'Choisir le lieu', 'Dresser la liste des invités', 'Envoyer les invitations', 'Choisir traiteur, musique, photographe', 'Tenues et alliances', 'Préparer la cérémonie', 'Organiser le jour J'],
  renovation: ['Définir le projet et le budget', 'Demander des devis', 'Choisir les artisans', 'Planifier les travaux', 'Commander les matériaux', 'Suivre le chantier', 'Réception des travaux'],
  baby: ['Rendez-vous médicaux', 'Préparer la chambre', 'Liste de naissance', 'Démarches administratives', 'Choisir le mode de garde', 'Préparer la valise de maternité', 'Organiser les premières semaines'],
  move: ['Fixer la date', 'Résilier et souscrire les contrats (énergie, internet)', 'Changement d’adresse', 'Trier et donner', 'Cartons', 'Réserver camion ou déménageurs', 'État des lieux', 'Installation'],
  custom: [],
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  async list(viewer: Viewer, includeArchived = false): Promise<ProjectDto[]> {
    const rows = await this.prisma.project.findMany({ where: { coupleId: viewer.couple.coupleId, ...(includeArchived ? {} : { status: { not: 'ARCHIVED' } }) }, include, orderBy: { updatedAt: 'desc' } });
    return rows.map(toDto);
  }

  async get(viewer: Viewer, id: string): Promise<ProjectDto> {
    return toDto(await this.require(viewer, id));
  }

  async create(viewer: Viewer, input: z.infer<typeof createProjectSchema>): Promise<ProjectDto> {
    const steps = TEMPLATE_STEPS[input.templateCode] ?? [];
    const row = await this.prisma.project.create({
      data: {
        coupleId: viewer.couple.coupleId, templateCode: input.templateCode, title: input.title, goal: input.goal ?? null, description: input.description ?? null,
        startAt: input.startAt ? new Date(input.startAt) : null, targetAt: input.targetAt ? new Date(input.targetAt) : null, budgetCents: input.budgetCents ?? null, currency: input.currency,
        steps: { create: steps.map((title, position) => ({ title, position })) },
      },
      include,
    });
    this.emit(viewer, row.id);
    return toDto(row);
  }

  async update(viewer: Viewer, id: string, input: z.infer<typeof updateProjectSchema>): Promise<ProjectDto> {
    await this.require(viewer, id);
    const row = await this.prisma.project.update({
      where: { id },
      data: {
        title: input.title, goal: input.goal, description: input.description, status: input.status, budgetCents: input.budgetCents, currency: input.currency,
        startAt: input.startAt === undefined ? undefined : input.startAt ? new Date(input.startAt) : null,
        targetAt: input.targetAt === undefined ? undefined : input.targetAt ? new Date(input.targetAt) : null,
      },
      include,
    });
    this.emit(viewer, id);
    return toDto(row);
  }

  async remove(viewer: Viewer, id: string): Promise<void> {
    await this.require(viewer, id);
    await this.prisma.project.delete({ where: { id } });
    this.emit(viewer, id);
  }

  async addStep(viewer: Viewer, id: string, input: z.infer<typeof createProjectStepSchema>): Promise<ProjectDto> {
    const project = await this.require(viewer, id);
    await this.prisma.projectStep.create({ data: { projectId: id, title: input.title, dueAt: input.dueAt ? new Date(input.dueAt) : null, position: project.steps.length } });
    this.emit(viewer, id);
    return this.get(viewer, id);
  }

  async updateStep(viewer: Viewer, id: string, stepId: string, input: z.infer<typeof updateProjectStepSchema>): Promise<ProjectDto> {
    await this.require(viewer, id);
    const step = await this.prisma.projectStep.findFirst({ where: { id: stepId, projectId: id } });
    if (!step) throw AppError.notFound('Étape introuvable.');
    await this.prisma.projectStep.update({ where: { id: stepId }, data: { title: input.title, position: input.position, dueAt: input.dueAt === undefined ? undefined : input.dueAt ? new Date(input.dueAt) : null, completedAt: input.completed === undefined ? undefined : input.completed ? new Date() : null } });
    this.emit(viewer, id);
    return this.get(viewer, id);
  }

  async removeStep(viewer: Viewer, id: string, stepId: string): Promise<ProjectDto> {
    await this.require(viewer, id);
    await this.prisma.projectStep.deleteMany({ where: { id: stepId, projectId: id } });
    this.emit(viewer, id);
    return this.get(viewer, id);
  }

  async addNote(viewer: Viewer, id: string, body: string): Promise<ProjectDto> {
    await this.require(viewer, id);
    await this.prisma.projectNote.create({ data: { projectId: id, body } });
    this.emit(viewer, id);
    return this.get(viewer, id);
  }

  async removeNote(viewer: Viewer, id: string, noteId: string): Promise<ProjectDto> {
    await this.require(viewer, id);
    await this.prisma.projectNote.deleteMany({ where: { id: noteId, projectId: id } });
    this.emit(viewer, id);
    return this.get(viewer, id);
  }

  private async require(viewer: Viewer, id: string): Promise<Row> {
    const row = await this.prisma.project.findFirst({ where: { id, coupleId: viewer.couple.coupleId }, include });
    if (!row) throw AppError.notFound('Projet introuvable.');
    return row;
  }
  private emit(viewer: Viewer, projectId: string) {
    this.realtime.emitToCouple(viewer.couple.coupleId, 'project.changed', { projectId });
  }
}

function toDto(row: Row): ProjectDto {
  const done = row.steps.filter((s) => s.completedAt).length;
  return {
    id: row.id, templateCode: row.templateCode, title: row.title, goal: row.goal, description: row.description, status: row.status,
    startAt: row.startAt?.toISOString().slice(0, 10) ?? null, targetAt: row.targetAt?.toISOString().slice(0, 10) ?? null, budgetCents: row.budgetCents, currency: row.currency,
    progress: row.steps.length ? Math.round((done / row.steps.length) * 100) : 0,
    steps: row.steps.map((s) => ({ id: s.id, title: s.title, position: s.position, dueAt: s.dueAt?.toISOString().slice(0, 10) ?? null, completedAt: s.completedAt?.toISOString() ?? null })),
    notes: row.notes.map((n) => ({ id: n.id, body: n.body, createdAt: n.createdAt.toISOString(), updatedAt: n.updatedAt.toISOString() })),
    openTasks: row._count.tasks,
    createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}
