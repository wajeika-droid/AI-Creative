import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';

const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: null,
});

function estimateTokens(input: unknown, output: unknown) {
  const raw = `${JSON.stringify(input ?? {})}${JSON.stringify(output ?? {})}`;
  return Math.max(1, Math.ceil(raw.length / 4));
}

async function callProvider(endpoint: string, apiKey: string | undefined, body: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Provider responded with ${response.status}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function processJob(data: any) {
  const { jobId, userId, providerId, type, input } = data;
  const existing = await prisma.aIJob.findUnique({ where: { id: jobId } });
  if (!existing) throw new Error(`Job ${jobId} tidak ditemukan`);
  if (existing.status === 'success') return existing.output;

  const provider = await prisma.aIProvider.findUniqueOrThrow({ where: { id: providerId } });
  const config = (provider.config || {}) as any;

  await prisma.aIJob.update({ where: { id: jobId }, data: { status: 'running' } });

  let output: any;
  if (config.endpoint) {
    output = await callProvider(config.endpoint, config.apiKey, { type, input });
  } else if (type.includes('video')) {
    output = {
      mock: true,
      type,
      url: null,
      preview: '/images/video-preview.png',
      echoedInput: input,
      generatedAt: new Date().toISOString(),
    };
  } else {
    const niche = (input as any)?.niche || 'topik Anda';
    const format = (input as any)?.type || 'konten';
    output = {
      mock: true,
      type,
      result: `[Mock] ${format} untuk niche ${niche}: ide konten siap dikembangkan bersama tim kreatif.`,
      echoedInput: input,
      generatedAt: new Date().toISOString(),
    };
  }

  await prisma.$transaction(async tx => {
    if (type.includes('video')) {
      await tx.generatedVideo.upsert({
        where: { jobId },
        update: { url: output.url ?? null, metadata: output },
        create: { userId, jobId, url: output.url ?? null, metadata: output },
      });
    } else {
      await tx.generatedContent.upsert({
        where: { jobId },
        update: { content: output },
        create: { userId, jobId, content: output },
      });
    }
    await tx.tokenUsage.upsert({
      where: { jobId },
      update: {},
      create: { userId, jobId, usedTokens: estimateTokens(input, output) },
    });
    await tx.aIJob.update({ where: { id: jobId }, data: { status: 'success', output } });
  });

  return output;
}

export const aiWorker = new Worker(
  'ai-jobs',
  async job => {
    try {
      return await processJob(job.data);
    } catch (err) {
      const attempts = job.opts.attempts ?? 1;
      if (job.attemptsMade + 1 >= attempts) {
        await prisma.aIJob
          .updateMany({
            where: { id: job.data.jobId, status: { not: 'success' } },
            data: { status: 'failed' },
          })
          .catch(() => undefined);
      }
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

aiWorker.on('completed', job => console.log(`Job ${job.id} selesai`));
aiWorker.on('failed', (job, err) => console.error(`Job ${job?.id} gagal: ${err.message}`));
