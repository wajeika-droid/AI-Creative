import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const quotaMap: Record<string, number> = {
  Free: 5000,
  Creator: 50000,
  Professional: 200000,
  Agency: 500000,
};

const subscribeSchema = z.object({
  plan: z.enum(['Free', 'Creator', 'Professional', 'Agency']),
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const parse = subscribeSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid plan', details: parse.error.format() });

  const userId = (req as any).user.id;
  const plan = parse.data.plan;
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);

  const sub = await prisma.subscription.upsert({
    where: { userId },
    update: { plan, tokenQuota: quotaMap[plan], endDate },
    create: { userId, plan, tokenQuota: quotaMap[plan], endDate },
  });
  res.json(sub);
});

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [subscription, usage] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    prisma.tokenUsage.findMany({
      where: { userId, date: { gte: monthStart } },
      orderBy: { date: 'desc' },
    }),
  ]);
  const usedTokens = usage.reduce((sum, item) => sum + item.usedTokens, 0);
  res.json({ subscription, usage, usedTokens });
});

export default router;
