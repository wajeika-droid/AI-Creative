import fs from 'node:fs/promises';
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

router.get('/watch/:name', async (req: Request, res: Response) => {
  const jobId = req.params.name.replace(/\.mp4$/i, '');
  if (!req.params.name.toLowerCase().endsWith('.mp4') || !VIDEO_FILE_PATTERN.test(jobId)) {
    return res.status(404).type('html').send('<p>Video tidak ditemukan.</p>');
  }
  const record = await prisma.generatedVideo.findFirst({
    where: { jobId },
    select: { id: true },
  });
  if (!record) return res.status(404).type('html').send('<p>Video tidak ditemukan.</p>');
  // Helmet's default CSP includes upgrade-insecure-requests, which rewrites the
  // same-origin <video> request to https and breaks playback on plain-HTTP hosts.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; media-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; base-uri 'self'; form-action 'self'"
  );
  res.type('html').send(`<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Preview Video - Creative Partner</title>
<style>
html,body{margin:0;height:100%;background:#070a12;color:#e6e9f4;font-family:system-ui,sans-serif}
main{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;height:100%;padding:16px;box-sizing:border-box}
video{width:min(100%,960px);max-height:80vh;border-radius:12px;background:#000;box-shadow:0 12px 40px rgba(0,0,0,.5)}
a{color:#b9a9ff;font-size:14px}
</style>
</head>
<body>
<main>
<video src="/api/v1/video/files/${jobId}.mp4" controls autoplay muted playsinline preload="auto"></video>
<a href="/api/v1/video/files/${jobId}.mp4" download>Unduh MP4</a>
</main>
</body>
</html>`);
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
  res.removeHeader('Content-Security-Policy');
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

router.delete('/:id', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const item = await prisma.generatedVideo.findFirst({
    where: { id: req.params.id, userId },
  });
  if (!item) return res.status(404).json({ error: 'Render tidak ditemukan' });
  await prisma.generatedVideo.delete({ where: { id: item.id } });
  await fs.rm(path.join(STORAGE_DIR, `${item.jobId}.mp4`), { force: true });
  res.json({ ok: true });
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
