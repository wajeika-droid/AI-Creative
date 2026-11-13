import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

// Register affiliate link
router.post('/register', authenticate, rbac('register_affiliate'), async (req: Request, res: Response) => {
  const { productId } = req.body;
  const creatorId = (req as any).user.id;
  const token = require('crypto').randomBytes(16).toString('hex');
  const link = await prisma.affiliateLink.create({
    data: { productId, creatorId, token },
    select: { id: true, token: true },
  });
  res.status(201).json(link);
});

// Affiliate stats for creator
router.get('/stats', authenticate, rbac('view_affiliate_stats'), async (req: Request, res: Response) => {
  const creatorId = (req as any).user.id;
  const clicks = await prisma.click.count({ where: { affiliateLink: { creatorId } } });
  const conversions = await prisma.conversion.findMany({ where: { affiliateLink: { creatorId } } });
  const totalEarned = conversions.reduce((sum, c) => sum + Number(c.amount), 0);
  res.json({ clicks, conversions: conversions.length, totalEarned });
});

router.get('/links', authenticate, rbac('view_affiliate_stats'), async (req: Request, res: Response) => {
  const creatorId = (req as any).user.id;
  const links = await prisma.affiliateLink.findMany({
    where: { creatorId },
    include: {
      product: { include: { campaign: true } },
      _count: { select: { clicks: true, conversions: true } },
    },
    orderBy: { id: 'desc' },
  });
  res.json(links);
});

export default router;

