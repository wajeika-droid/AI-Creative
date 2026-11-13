import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate, rbac('manage_users'));

router.get('/users', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      createdAt: true,
      role: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json(users);
});

router.get('/roles', async (_req: Request, res: Response) => {
  const roles = await prisma.role.findMany({ include: { permissions: true } });
  res.json(roles);
});

const providerSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'image', 'video', 'voice']),
  endpoint: z.string().url().optional(),
  apiKey: z.string().optional(),
});

router.get('/providers', async (_req: Request, res: Response) => {
  const providers = await prisma.aIProvider.findMany({ orderBy: { name: 'asc' } });
  res.json(providers);
});

router.post('/providers', async (req: Request, res: Response) => {
  const parse = providerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const { name, type, endpoint, apiKey } = parse.data;
  const provider = await prisma.aIProvider.create({
    data: { name, type, config: { endpoint, apiKey } },
  });
  res.status(201).json(provider);
});

router.get('/audit-logs', async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { email: true } } },
  });
  res.json(logs);
});

export default router;
