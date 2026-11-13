import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const subscribeSchema = z.object({
  plan: z.enum(['Free', 'Creator', 'Professional', 'Agency']),
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const parse = subscribeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid plan', details: parse.error.format() });

  const userId = (req as any).user.id;
  const plan = parse.data.plan;
  const quotaMap: Record<string, number> = {
    Free: 5000,
    Creator: 50000,
    Professional: 200000,
    Agency: 500000,
  };

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: { plan, tokenQuota: quotaMap[plan] },
    create: { userId, plan, tokenQuota: quotaMap[plan] },
  });
  res.json(sub);
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const sub = await prisma.subscription.findUnique({ where: { userId } });
  const usage = await prisma.tokenUsage.findMany({ where: { userId } });
  res.json({ subscription: sub, usage });
});

export default router;

