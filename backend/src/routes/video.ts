import path from 'node:path';
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { assertQuota, submitAIJob } from '../services/aiProvider';

const router = Router();
const STORAGE_DIR = process.env.VIDEO_STORAGE_DIR || '/app/storage';
const VIDEO_FILE_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sceneSchema = z.object({
  mediaId: z.string().trim().max(40).optional(),
  duration: z.number().min(1).max(120),
  dataUrl: z.string().max(9000000).optional(),
});

const videoSchema = z
  .object({
    source: z.enum(['text', 'image', 'script', 'product']),
    text: z.string().trim().min(1).optional(),
    images: z.array(z.string()).max(10).optional(),
    script: z.string().trim().min(1).optional(),
    productId: z.string().uuid().optional(),
    format: z.enum(['9:16', '16:9', '1:1']),
    scenes: z.array(sceneSchema).max(8).optional(),
    caption: z.string().max(2000).optional(),
    showSubtitles: z.boolean().optional(),
    subtitleSize: z.enum(['Small', 'Medium', 'Large']).optional(),
    subtitlePosition: z.enum(['Top', 'Bottom']).optional(),
    transition: z.enum(['None', 'Fade', 'Slide', 'Zoom']).optional(),
    transitionDuration: z.number().min(0).max(2).optional(),
    brandName: z.string().max(60).optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    brandFont: z.string().max(40).optional(),
    resolution: z.string().max(40).optional(),
    fps: z.string().max(20).optional(),
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

router.get('/files/:name', async (req: Request, res: Response) => {
  const jobId = req.params.name.replace(/\.mp4$/i, '');
  if (!req.params.name.toLowerCase().endsWith('.mp4') || !VIDEO_FILE_PATTERN.test(jobId)) {
    return res.status(404).json({ error: 'File tidak ditemukan' });
  }
  const record = await prisma.generatedVideo.findFirst({
    where: { jobId },
    select: { id: true },
  });
  if (!record) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.sendFile(path.join(STORAGE_DIR, `${jobId}.mp4`), error => {
    if (error && !res.headersSent) res.status(404).json({ error: 'File tidak ditemukan' });
  });
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
