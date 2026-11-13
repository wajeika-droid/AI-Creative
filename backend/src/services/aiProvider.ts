import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

export const aiJobQueue = new Queue('ai-jobs', { connection });

type SubmitParams = {
  userId: string;
  providerId?: string | null;
  type: string;
  input: unknown;
};

export async function assertQuota(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) return;
  if (subscription.endDate && subscription.endDate < new Date()) {
    const err: any = new Error('Langganan sudah berakhir, perpanjang paket terlebih dahulu');
    err.status = 402;
    throw err;
  }
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const usage = await prisma.tokenUsage.aggregate({
    where: { userId, date: { gte: monthStart } },
    _sum: { usedTokens: true },
  });
  if ((usage._sum.usedTokens ?? 0) >= subscription.tokenQuota) {
    const err: any = new Error('Kuota token bulanan habis, upgrade paket untuk melanjutkan');
    err.status = 429;
    throw err;
  }
}

export async function submitAIJob(params: SubmitParams) {
  let provider = params.providerId
    ? await prisma.aIProvider.findFirst({ where: { id: params.providerId, enabled: true } })
    : null;

  if (!provider) {
    const kind = params.type.includes('video') ? 'video' : 'text';
    provider = await prisma.aIProvider.findFirst({
      where: { enabled: true, type: kind },
      orderBy: { name: 'asc' },
    });
  }

  if (!provider) {
    const err: any = new Error('Belum ada AI provider aktif');
    err.status = 503;
    throw err;
  }

  const record = await prisma.aIJob.create({
    data: {
      userId: params.userId,
      providerId: provider.id,
      type: params.type,
      status: 'queued',
      input: params.input as any,
    },
  });

  await aiJobQueue.add(
    'run',
    {
      jobId: record.id,
      userId: params.userId,
      providerId: provider.id,
      type: params.type,
      input: params.input,
    },
    {
      jobId: record.id,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 3600, count: 500 },
      removeOnFail: { age: 86400, count: 500 },
    }
  );

  return record;
}
