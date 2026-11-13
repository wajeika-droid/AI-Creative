import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

const registerSchema = z.object({
  productId: z.string().uuid(),
});

const convertSchema = z.object({
  token: z.string().min(8),
  orderId: z.string().trim().min(1).max(120).optional(),
});

function commissionFor(product: { affiliateCommission: number; price: Prisma.Decimal }, rate: number) {
  const fixed = Number(product.affiliateCommission);
  const value = fixed > 0 ? fixed : (Number(product.price) * rate) / 100;
  return Math.round(value * 100) / 100;
}

router.post('/register', authenticate, rbac('register_affiliate'), async (req: Request, res: Response) => {
  const parse = registerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Product ID tidak valid' });

  const product = await prisma.product.findUnique({ where: { id: parse.data.productId } });
  if (!product) return res.status(404).json({ error: 'Produk tidak ditemukan' });

  const creatorId = (req as any).user.id;
  const existing = await prisma.affiliateLink.findFirst({
    where: { productId: product.id, creatorId },
    select: { id: true, token: true },
  });
  if (existing) {
    return res.json({ ...existing, existing: true });
  }

  const token = randomBytes(16).toString('hex');
  const link = await prisma.affiliateLink.create({
    data: { productId: product.id, creatorId, token },
    select: { id: true, token: true },
  });
  res.status(201).json(link);
});

router.get('/products', authenticate, rbac('register_affiliate'), async (_req: Request, res: Response) => {
  const products = await prisma.product.findMany({
    where: { campaign: { OR: [{ endDate: null }, { endDate: { gte: new Date() } }] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      price: true,
      affiliateCommission: true,
      campaign: { select: { name: true, commissionRate: true } },
    },
  });
  res.json(products);
});

router.get('/track/:token', async (req: Request, res: Response) => {
  const link = await prisma.affiliateLink.findUnique({
    where: { token: req.params.token },
    include: { product: { include: { campaign: { select: { name: true, commissionRate: true } } } } },
  });
  if (!link) return res.status(404).json({ error: 'Link affiliate tidak ditemukan' });

  await prisma.click.create({ data: { affiliateLinkId: link.id } });

  res.json({
    product: {
      name: link.product.name,
      price: link.product.price,
      url: link.product.url,
      commission: commissionFor(link.product, link.product.campaign.commissionRate),
    },
    campaign: link.product.campaign.name,
  });
});

router.post('/convert', async (req: Request, res: Response) => {
  const parse = convertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Data konversi tidak valid' });
  const { token, orderId } = parse.data;

  const link = await prisma.affiliateLink.findUnique({
    where: { token },
    include: { product: { include: { campaign: true } } },
  });
  if (!link) return res.status(404).json({ error: 'Link affiliate tidak ditemukan' });

  if (orderId) {
    const existing = await prisma.conversion.findUnique({ where: { orderId } });
    if (existing) {
      return res.json({ conversionId: existing.id, amount: existing.amount, duplicate: true });
    }
  }

  const amount = commissionFor(link.product, link.product.campaign.commissionRate);
  if (amount <= 0) {
    return res.status(400).json({ error: 'Produk belum memiliki nilai komisi' });
  }

  try {
    const conversion = await prisma.$transaction(async tx => {
      const record = await tx.conversion.create({
        data: { affiliateLinkId: link.id, amount: new Prisma.Decimal(amount), orderId: orderId ?? null },
      });
      await tx.commission.create({
        data: {
          userId: link.creatorId,
          conversionId: record.id,
          amount: new Prisma.Decimal(amount),
          description: `Komisi ${link.product.name}`,
        },
      });
      const wallet = await tx.wallet.upsert({
        where: { userId: link.creatorId },
        update: { balance: { increment: new Prisma.Decimal(amount) } },
        create: { userId: link.creatorId, balance: new Prisma.Decimal(amount) },
      });
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: new Prisma.Decimal(amount),
          type: 'commission',
          note: `Konversi ${link.product.name}`,
        },
      });
      return record;
    });

    res.status(201).json({ conversionId: conversion.id, amount: conversion.amount });
  } catch (err: any) {
    if (err?.code === 'P2002' && orderId) {
      const existing = await prisma.conversion.findUnique({ where: { orderId } });
      if (existing) {
        return res.json({ conversionId: existing.id, amount: existing.amount, duplicate: true });
      }
    }
    throw err;
  }
});

router.get('/stats', authenticate, rbac('view_affiliate_stats'), async (req: Request, res: Response) => {
  const creatorId = (req as any).user.id;
  const [clicks, conversions, commissionAgg] = await Promise.all([
    prisma.click.count({ where: { affiliateLink: { creatorId } } }),
    prisma.conversion.count({ where: { affiliateLink: { creatorId } } }),
    prisma.commission.aggregate({ where: { userId: creatorId }, _sum: { amount: true } }),
  ]);
  res.json({
    clicks,
    conversions,
    totalEarned: commissionAgg._sum.amount ?? 0,
  });
});

router.get('/links', authenticate, rbac('view_affiliate_stats'), async (req: Request, res: Response) => {
  const creatorId = (req as any).user.id;
  const links = await prisma.affiliateLink.findMany({
    where: { creatorId },
    include: {
      product: { include: { campaign: { select: { name: true } } } },
      _count: { select: { clicks: true, conversions: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(links);
});

export default router;
