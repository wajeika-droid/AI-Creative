import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { submitAIJob } from '../services/aiProvider';

const router = Router();

const videoSchema = z.object({
  source: z.enum(['text', 'image', 'script', 'product']),
  text: z.string().optional(),
  images: z.array(z.string()).optional(),
  script: z.string().optional(),
  productId: z.string().optional(),
  format: z.enum(['9:16', '16:9', '1:1']),
});

router.post('/render', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const parse = videoSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const userId = (req as any).user.id;
  const job = await submitAIJob({
    userId,
    providerId: process.env.DEFAULT_VIDEO_PROVIDER_ID || '',
    type: 'video_render',
    input: parse.data,
  });

  res.status(202).json({ jobId: job.id, status: job.status });
});

export default router;

