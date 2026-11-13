import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

function safeProvider(provider: any) {
  const config = (provider.config || {}) as any;
  return {
    id: provider.id,
    name: provider.name,
    type: provider.type,
    enabled: provider.enabled,
    endpoint: config.endpoint ?? null,
    hasApiKey: Boolean(config.apiKey),
    jobCount: provider._count?.jobs ?? undefined,
  };
}

router.get('/users', rbac('manage_users'), async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
      wallet: { select: { balance: true, pending: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

router.get('/roles', rbac('manage_users'), async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({
    include: { permissions: { select: { name: true } }, _count: { select: { users: true } } },
    orderBy: { name: 'asc' },
  });
  res.json(roles);
});

router.get('/providers', rbac('manage_users'), async (_req: Request, res: Response) => {
  const providers = await prisma.aIProvider.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { jobs: true } } },
  });
  res.json(providers.map(safeProvider));
});

const providerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(['text', 'image', 'video', 'voice']),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
});

router.post('/providers', rbac('manage_ai_providers'), async (req: Request, res: Response) => {
  const parse = providerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const { name, type, endpoint, apiKey } = parse.data;
  const provider = await prisma.aIProvider.create({
    data: { name, type, config: { endpoint: endpoint ?? null, apiKey: apiKey ?? null } },
  });
  await prisma.auditLog.create({
    data: {
      userId: (req as any).user.id,
      action: 'ai_provider.create',
      details: { providerId: provider.id, name, type },
    },
  });
  res.status(201).json(safeProvider(provider));
});

router.patch('/providers/:id', rbac('manage_ai_providers'), async (req: Request, res: Response) => {
  const parse = z.object({ enabled: z.boolean() }).safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input' });

  const provider = await prisma.aIProvider.update({
    where: { id: req.params.id },
    data: { enabled: parse.data.enabled },
  });
  await prisma.auditLog.create({
    data: {
      userId: (req as any).user.id,
      action: 'ai_provider.update',
      details: { providerId: provider.id, enabled: provider.enabled },
    },
  });
  res.json(safeProvider(provider));
});

router.get('/payouts', rbac('manage_users'), async (_req: Request, res: Response) => {
  const payouts = await prisma.payout.findMany({
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: { wallet: { include: { user: { select: { email: true } } } } },
  });
  res.json(payouts);
});

const payoutStatusSchema = z.object({
  status: z.enum(['approved', 'paid', 'rejected']),
});

const allowedTransitions: Record<string, string[]> = {
  pending: ['approved', 'paid', 'rejected'],
  approved: ['paid', 'rejected'],
  paid: [],
  rejected: [],
};

router.patch('/payouts/:id', rbac('manage_users'), async (req: Request, res: Response) => {
  const parse = payoutStatusSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Status tidak valid' });

  const payout = await prisma.payout.findUnique({ where: { id: req.params.id } });
  if (!payout) return res.status(404).json({ error: 'Payout tidak ditemukan' });
  const allowed = allowedTransitions[payout.status] ?? [];
  if (!allowed.includes(parse.data.status)) {
    return res
      .status(409)
      .json({ error: `Transisi ${payout.status} → ${parse.data.status} tidak diizinkan` });
  }

  await prisma.$transaction(async tx => {
    const updated = await tx.payout.updateMany({
      where: { id: payout.id, status: payout.status },
      data: { status: parse.data.status, processedAt: new Date() },
    });
    if (updated.count === 0) {
      const err: any = new Error('Payout sudah diproses');
      err.status = 409;
      throw err;
    }
    if (parse.data.status === 'paid') {
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: { pending: { decrement: payout.amount } },
      });
    }
    if (parse.data.status === 'rejected') {
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: { pending: { decrement: payout.amount }, balance: { increment: payout.amount } },
      });
      await tx.transaction.create({
        data: {
          walletId: payout.walletId,
          amount: payout.amount,
          type: 'payout_refund',
          note: `Payout ${payout.id} ditolak`,
        },
      });
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: (req as any).user.id,
      action: `payout.${parse.data.status}`,
      details: { payoutId: payout.id, amount: payout.amount.toString() },
    },
  });

  res.json({ message: `Payout ${parse.data.status}` });
});

router.get('/audit-logs', rbac('view_audit_logs'), async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { email: true } } },
  });
  res.json(logs);
});

export default router;
