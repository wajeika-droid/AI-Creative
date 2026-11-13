import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export async function submitAIJob(params: SubmitParams) {
  let provider = params.providerId
    ? await prisma.aIProvider.findUnique({ where: { id: params.providerId } })
    : null;

  if (!provider) {
    const kind = params.type.includes('video') ? 'video' : 'text';
    provider = await prisma.aIProvider.findFirst({ where: { enabled: true, type: kind } });
  }

  if (!provider) {
    const err: any = new Error('No AI provider configured');
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
    { jobId: record.id }
  );

  return record;
}

async function processJob(data: any) {
  const { jobId, userId, providerId, type, input } = data;
  const provider = await prisma.aIProvider.findUniqueOrThrow({ where: { id: providerId } });
  const config = (provider.config || {}) as any;

  await prisma.aIJob.update({ where: { id: jobId }, data: { status: 'running' } });

  let output: any;
  if (config.endpoint) {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ type, input }),
    });
    if (!response.ok) {
      throw new Error(`Provider responded with ${response.status}`);
    }
    output = await response.json();
  } else {
    output = { mock: true, type, echoedInput: input, generatedAt: new Date().toISOString() };
  }

  await prisma.aIJob.update({ where: { id: jobId }, data: { status: 'success', output } });

  if (type.includes('video')) {
    await prisma.generatedVideo.create({
      data: {
        userId,
        jobId,
        url: output.url || `http://localhost:9000/creative/mock-${jobId}.mp4`,
        metadata: output.metadata ?? output,
      },
    });
  } else {
    await prisma.generatedContent.create({
      data: { userId, jobId, content: output },
    });
  }

  return output;
}

export const aiWorker = new Worker(
  'ai-jobs',
  async job => {
    try {
      const result = await processJob(job.data);
      return result;
    } catch (err) {
      await prisma.aIJob
        .update({ where: { id: job.data.jobId }, data: { status: 'failed' } })
        .catch(() => undefined);
      throw err;
    }
  },
  { connection }
);

aiWorker.on('completed', job => console.log(`Job ${job.id} selesai`));
aiWorker.on('failed', (job, err) => console.error(`Job ${job?.id} gagal`, err));
