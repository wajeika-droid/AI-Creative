import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

const money = z.string().regex(/^\d+(\.\d{1,2})?$/);

const campaignSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    budget: money.refine(value => Number(value) > 0, { message: 'Budget harus lebih dari 0' }),
    commissionRate: z.number().min(0).max(100),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  })
  .refine(
    data => !data.startDate || !data.endDate || new Date(data.endDate) > new Date(data.startDate),
    { message: 'Tanggal selesai harus setelah tanggal mulai' }
  );

const productSchema = z.object({
  name: z.string().trim().min(2).max(120),
  price: money,
  affiliateCommission: money,
  url: z.string().url().optional().or(z.literal('')),
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
  const list = await prisma.campaign.findMany({
    where: { advertiserId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { products: true } } },
  });
  res.json(list);
});

router.post(
  '/campaign/:id/product',
  authenticate,
  rbac('create_campaign'),
  async (req: Request, res: Response) => {
    const parse = productSchema.safeParse(req.body);
    if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

    const advertiserId = (req as any).user.id;
    const campaign = await prisma.campaign.findFirst({
      where: { id: req.params.id, advertiserId },
      select: { id: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign tidak ditemukan' });

    const product = await prisma.product.create({
      data: {
        campaignId: campaign.id,
        name: parse.data.name,
        price: parse.data.price,
        affiliateCommission: Number(parse.data.affiliateCommission),
        url: parse.data.url || null,
      },
    });
    res.status(201).json(product);
  }
);

router.get('/products', authenticate, rbac('view_own_campaigns'), async (req: Request, res: Response) => {
  const advertiserId = (req as any).user.id;
  const products = await prisma.product.findMany({
    where: { campaign: { advertiserId } },
    orderBy: { createdAt: 'desc' },
    include: { campaign: { select: { name: true } } },
  });
  res.json(products);
});

export default router;
