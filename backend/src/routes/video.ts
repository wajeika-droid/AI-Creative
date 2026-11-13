import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { assertQuota, submitAIJob } from '../services/aiProvider';

const router = Router();

const videoSchema = z
  .object({
    source: z.enum(['text', 'image', 'script', 'product']),
    text: z.string().trim().min(1).optional(),
    images: z.array(z.string()).max(10).optional(),
    script: z.string().trim().min(1).optional(),
    productId: z.string().uuid().optional(),
    format: z.enum(['9:16', '16:9', '1:1']),
  })
  .refine(
    data =>
      (data.source === 'text' && !!data.text) ||
      (data.source === 'script' && !!data.script) ||
      (data.source === 'product' && !!data.productId) ||
      (data.source === 'image' && !!data.images?.length),
    { message: 'Sumber video tidak lengkap' }
  );

router.post('/render', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const parse = videoSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const userId = (req as any).user.id;
  await assertQuota(userId);

  const job = await submitAIJob({
    userId,
    providerId: process.env.DEFAULT_VIDEO_PROVIDER_ID || '',
    type: 'video_render',
    input: parse.data,
  });

  res.status(202).json({ jobId: job.id, status: job.status });
});

router.get('/', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const items = await prisma.generatedVideo.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      job: {
        select: {
          status: true,
          type: true,
          input: true,
          provider: { select: { name: true } },
        },
      },
    },
  });
  res.json(items);
});

router.get('/jobs/:id', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const job = await prisma.aIJob.findFirst({
    where: { id: req.params.id, userId },
    include: { provider: { select: { name: true } } },
  });
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan' });
  res.json(job);
});

export default router;
