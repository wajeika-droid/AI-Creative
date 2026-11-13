import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();
const prisma = new PrismaClient();

router.get('/summary', authenticate, rbac('view_dashboard'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;

  const [contentCount, videoCount, clickCount, conversionCount, commissionAgg, wallet] = await Promise.all([
    prisma.generatedContent.count({ where: { userId } }),
    prisma.generatedVideo.count({ where: { userId } }),
    prisma.click.count({ where: { affiliateLink: { creatorId: userId } } }),
    prisma.conversion.count({ where: { affiliateLink: { creatorId: userId } } }),
    prisma.commission.aggregate({ where: { userId }, _sum: { amount: true } }),
    prisma.wallet.findUnique({ where: { userId } }),
  ]);

  res.json({
    totalContent: contentCount,
    totalVideo: videoCount,
    totalClicks: clickCount,
    totalConversions: conversionCount,
    totalCommission: commissionAgg._sum.amount ?? 0,
    balance: wallet?.balance ?? 0,
    pending: wallet?.pending ?? 0,
  });
});

router.get('/series', authenticate, rbac('view_dashboard'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 13);

  const [contents, clicks, conversions, commissions] = await Promise.all([
    prisma.generatedContent.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.click.findMany({
      where: { affiliateLink: { creatorId: userId }, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.conversion.findMany({
      where: { affiliateLink: { creatorId: userId }, createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
    }),
    prisma.commission.findMany({
      where: { userId, createdAt: { gte: since } },
      select: { createdAt: true, amount: true },
    }),
  ]);

  const days = Array.from({ length: 14 }, (_, i) => {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    return {
      date: date.toISOString().slice(0, 10),
      content: 0,
      clicks: 0,
      conversions: 0,
      commission: 0,
    };
  });
  const byDate = new Map(days.map(day => [day.date, day]));
  const key = (value: Date) => value.toISOString().slice(0, 10);

  contents.forEach(item => {
    const bucket = byDate.get(key(item.createdAt));
    if (bucket) bucket.content += 1;
  });
  clicks.forEach(item => {
    const bucket = byDate.get(key(item.createdAt));
    if (bucket) bucket.clicks += 1;
  });
  conversions.forEach(item => {
    const bucket = byDate.get(key(item.createdAt));
    if (bucket) {
      bucket.conversions += 1;
      bucket.commission += Number(item.amount);
    }
  });
  commissions.forEach(item => {
    const bucket = byDate.get(key(item.createdAt));
    if (bucket) bucket.commission += Number(item.amount);
  });

  res.json(days);
});

router.get('/recent', authenticate, rbac('view_dashboard'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const jobs = await prisma.aIJob.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 7,
    include: { provider: { select: { name: true } } },
  });
  res.json(jobs);
});

export default router;

