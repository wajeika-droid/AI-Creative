import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { assertQuota, submitAIJob } from '../services/aiProvider';

const router = Router();

const generateSchema = z.object({
  niche: z.string().trim().min(1),
  audience: z.string().trim().min(1),
  platform: z.string().trim().min(1),
  language: z.string().trim().min(1),
  tone: z.string().trim().min(1),
  duration: z.number().min(1).max(3600),
  type: z.enum([
    'idea',
    'script',
    'caption',
    'hashtag',
    'title',
    'description',
    'cta',
    'storytelling',
    'promo',
    'educational',
  ]),
});

router.post('/generate', authenticate, rbac('create_content'), async (req: Request, res: Response) => {
  const parse = generateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  }
  const userId = (req as any).user.id;
  await assertQuota(userId);

  const payload = { ...parse.data, userId };
  const job = await submitAIJob({
    userId,
    providerId: process.env.DEFAULT_TEXT_PROVIDER_ID || '',
    type: 'text_generation',
    input: payload,
  });

  res.status(202).json({ jobId: job.id, status: job.status });
});

router.get('/', authenticate, rbac('create_content'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const items = await prisma.generatedContent.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 30,
    include: {
      job: {
        select: {
          status: true,
          type: true,
          provider: { select: { name: true } },
        },
      },
    },
  });
  res.json(items);
});

router.get('/jobs/:id', authenticate, rbac('create_content'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const job = await prisma.aIJob.findFirst({
    where: { id: req.params.id, userId },
    include: { provider: { select: { name: true } } },
  });
  if (!job) return res.status(404).json({ error: 'Job tidak ditemukan' });
  res.json(job);
});

export default router;
