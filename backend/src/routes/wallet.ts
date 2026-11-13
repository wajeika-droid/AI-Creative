import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

router.get('/balance', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const wallet = await prisma.wallet.findUnique({ where: { userId } });
  res.json(wallet);
});

router.post('/withdraw', authenticate, rbac('request_withdraw'), async (req: Request, res: Response) => {
  const schema = z.object({
    amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
    bankAccount: z.string(),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const { amount, bankAccount } = parse.data;
  const userId = (req as any).user.id;

  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  if (Number(wallet.balance) < Number(amount)) {
    return res.status(400).json({ error: 'Saldo tidak cukup' });
  }

  await prisma.$transaction([
    prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: Number(amount) },
        pending: { increment: Number(amount) },
      },
    }),
    prisma.payout.create({
      data: {
        walletId: wallet.id,
        amount: Number(amount),
        status: 'pending',
        note: `Bank account: ${bankAccount}`,
      },
    }),
  ]);

  res.json({ message: 'Permintaan pencairan diterima, menunggu verifikasi' });
});

export default router;

