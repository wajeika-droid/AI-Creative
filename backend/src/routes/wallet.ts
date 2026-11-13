import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

const withdrawSchema = z.object({
  amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .refine(value => Number(value) >= 1 && Number(value) <= 1_000_000_000, {
      message: 'Jumlah withdraw tidak valid',
    }),
  bankAccount: z.string().trim().min(4).max(120),
});

async function ensureWallet(userId: string) {
  return prisma.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
}

router.get('/', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const wallet = await ensureWallet(userId);
  const [transactions, payouts] = await Promise.all([
    prisma.transaction.findMany({ where: { walletId: wallet.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.payout.findMany({ where: { walletId: wallet.id }, orderBy: { requestedAt: 'desc' }, take: 20 }),
  ]);
  res.json({ ...wallet, transactions, payouts });
});

router.get('/balance', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  res.json(await ensureWallet(userId));
});

router.post('/withdraw', authenticate, rbac('request_withdraw'), async (req: Request, res: Response) => {
  const parse = withdrawSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const userId = (req as any).user.id;
  const amount = new Prisma.Decimal(parse.data.amount);

  const payout = await prisma.$transaction(async tx => {
    const updated = await tx.wallet.updateMany({
      where: { userId, balance: { gte: amount } },
      data: { balance: { decrement: amount }, pending: { increment: amount } },
    });
    if (updated.count === 0) {
      const err: any = new Error('Saldo tidak cukup');
      err.status = 400;
      throw err;
    }
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { userId } });
    const record = await tx.payout.create({
      data: {
        walletId: wallet.id,
        amount,
        status: 'pending',
        note: `Bank account: ${parse.data.bankAccount}`,
      },
    });
    await tx.transaction.create({
      data: {
        walletId: wallet.id,
        amount: amount.negated(),
        type: 'withdraw_request',
        note: `Payout ${record.id} · ${parse.data.bankAccount}`,
      },
    });
    return record;
  });

  res.json({ message: 'Permintaan pencairan diterima, menunggu verifikasi', payoutId: payout.id });
});

export default router;
