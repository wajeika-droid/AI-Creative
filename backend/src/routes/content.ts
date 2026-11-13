import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { submitAIJob } from '../services/aiProvider';

const router = Router();
const prisma = new PrismaClient();

const generateSchema = z.object({
  niche: z.string(),
  audience: z.string(),
  platform: z.string(),
  language: z.string(),
  tone: z.string(),
  duration: z.number(),
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
  const payload = { ...parse.data, userId };

  const job = await submitAIJob({
    userId,
    providerId: process.env.DEFAULT_TEXT_PROVIDER_ID || '',
    type: 'text_generation',
    input: payload,
  });

  res.status(202).json({ jobId: job.id, status: job.status });
});

export default router;

