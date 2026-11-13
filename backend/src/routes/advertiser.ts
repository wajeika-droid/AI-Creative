import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const campaignSchema = z.object({
  name: z.string(),
  budget: z.string().regex(/^\d+(\.\d{1,2})?$/),
  commissionRate: z.number().min(0).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

router.post('/campaign', authenticate, rbac('create_campaign'), async (req: Request, res: Response) => {
  const parse = campaignSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  const advertiserId = (req as any).user.id;
  const data = parse.data;
  const campaign = await prisma.campaign.create({
    data: {
      advertiserId,
      name: data.name,
      budget: data.budget,
      commissionRate: data.commissionRate,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    },
  });
  res.status(201).json(campaign);
});

router.get('/campaign', authenticate, rbac('view_own_campaigns'), async (req: Request, res: Response) => {
  const advertiserId = (req as any).user.id;
  const list = await prisma.campaign.findMany({ where: { advertiserId } });
  res.json(list);
});

export default router;

