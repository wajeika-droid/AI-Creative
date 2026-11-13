import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { assertQuota, submitAIJob } from '../services/aiProvider';
import { computeNextRun, isValidTime, isScheduleType } from '../services/automationSchedule';

const router = Router();

const sceneSchema = z.object({
  mediaId: z.string().trim().max(40).optional(),
  duration: z.number().min(1).max(120),
});

const inputSchema = z.object({
  format: z.enum(['9:16', '16:9', '1:1']).optional(),
  caption: z.string().trim().min(1).max(2000),
  voiceScript: z.string().max(1500).optional(),
  showSubtitles: z.boolean().optional(),
  autoSubtitles: z.boolean().optional(),
  subtitleSize: z.enum(['Small', 'Medium', 'Large']).optional(),
  subtitlePosition: z.enum(['Top', 'Bottom']).optional(),
  transition: z.enum(['None', 'Fade', 'Slide', 'Zoom']).optional(),
  brandName: z.string().max(60).optional(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  voiceEnabled: z.boolean().optional(),
  voice: z.string().max(40).optional(),
  language: z.string().max(40).optional(),
  speed: z.number().min(0.5).max(2).optional(),
  mood: z.string().max(20).optional(),
  musicStyle: z.enum(['None', 'Soft Ambient', 'Upbeat', 'Cinematic']).optional(),
  musicVolume: z.number().min(0).max(1).optional(),
  scenes: z.array(sceneSchema).max(8).optional(),
});

const automationSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    scheduleType: z.string().refine(isScheduleType, { message: 'Jadwal tidak dikenal' }),
    timeOfDay: z.string().refine(isValidTime, { message: 'Jam harus HH:MM' }),
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    enabled: z.boolean().optional(),
    input: inputSchema,
  })
  .refine(data => data.scheduleType !== 'weekly' || data.dayOfWeek != null, {
    message: 'Pilih hari untuk jadwal mingguan',
    path: ['dayOfWeek'],
  });

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  scheduleType: z.string().optional(),
  timeOfDay: z.string().optional(),
  dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
  enabled: z.boolean().optional(),
  input: inputSchema.optional(),
});

function renderPayload(input: z.infer<typeof inputSchema>) {
  return {
    source: 'text' as const,
    text: input.caption,
    script: input.caption,
    ...input,
  };
}

function nextRun(data: { scheduleType: string; timeOfDay: string; dayOfWeek?: number | null; enabled?: boolean }) {
  if (data.enabled === false) return null;
  return computeNextRun(
    data.scheduleType === 'weekly' ? 'weekly' : 'daily',
    data.timeOfDay,
    data.dayOfWeek ?? null
  );
}

function serialize(item: any) {
  return {
    ...item,
    nextRunAt: item.nextRunAt,
    lastRunAt: item.lastRunAt,
    scheduleType: item.scheduleType,
  };
}

router.get('/', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const items = await prisma.automation.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const jobIds = items.map(item => item.lastJobId).filter((id): id is string => !!id);
  const jobs = jobIds.length
    ? await prisma.aIJob.findMany({
        where: { id: { in: jobIds } },
        select: { id: true, status: true },
      })
    : [];
  const statusById = new Map(jobs.map(job => [job.id, job.status]));
  res.json(
    items.map(item => ({
      ...serialize(item),
      lastJobStatus: item.lastJobId ? statusById.get(item.lastJobId) ?? null : null,
    }))
  );
});

router.post('/', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const parse = automationSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  const userId = (req as any).user.id;
  const data = parse.data;
  const enabled = data.enabled ?? true;
  const item = await prisma.automation.create({
    data: {
      userId,
      name: data.name,
      scheduleType: data.scheduleType,
      timeOfDay: data.timeOfDay,
      dayOfWeek: data.scheduleType === 'weekly' ? data.dayOfWeek ?? null : null,
      input: renderPayload(data.input) as any,
      enabled,
      nextRunAt: nextRun({ ...data, enabled }),
    },
  });
  res.status(201).json(serialize(item));
});

router.patch('/:id', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const existing = await prisma.automation.findFirst({ where: { id: req.params.id, userId } });
  if (!existing) return res.status(404).json({ error: 'Otomasi tidak ditemukan' });

  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });

  const merged = automationSchema.safeParse({
    name: parse.data.name ?? existing.name,
    scheduleType: parse.data.scheduleType ?? existing.scheduleType,
    timeOfDay: parse.data.timeOfDay ?? existing.timeOfDay,
    dayOfWeek: parse.data.dayOfWeek !== undefined ? parse.data.dayOfWeek : existing.dayOfWeek,
    enabled: parse.data.enabled ?? existing.enabled,
    input: parse.data.input ?? existing.input,
  });
  if (!merged.success) return res.status(400).json({ error: 'Invalid input', details: merged.error.format() });

  const data = merged.data;
  const item = await prisma.automation.update({
    where: { id: existing.id },
    data: {
      name: data.name,
      scheduleType: data.scheduleType,
      timeOfDay: data.timeOfDay,
      dayOfWeek: data.scheduleType === 'weekly' ? data.dayOfWeek ?? null : null,
      input: renderPayload(data.input) as any,
      enabled: data.enabled ?? true,
      nextRunAt: nextRun({ ...data, enabled: data.enabled ?? true }),
    },
  });
  res.json(serialize(item));
});

router.delete('/:id', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const deleted = await prisma.automation.deleteMany({ where: { id: req.params.id, userId } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Otomasi tidak ditemukan' });
  res.json({ ok: true });
});

router.post('/:id/run', authenticate, rbac('create_video'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const item = await prisma.automation.findFirst({ where: { id: req.params.id, userId } });
  if (!item) return res.status(404).json({ error: 'Otomasi tidak ditemukan' });

  await assertQuota(userId);
  const job = await submitAIJob({
    userId,
    providerId: process.env.DEFAULT_VIDEO_PROVIDER_ID || '',
    type: 'video_render',
    input: { ...(item.input as Record<string, unknown>), automationId: item.id },
  });
  const now = new Date();
  await prisma.automation.update({
    where: { id: item.id },
    data: {
      lastRunAt: now,
      lastJobId: job.id,
      nextRunAt: item.enabled
        ? computeNextRun(
            isScheduleType(item.scheduleType) ? item.scheduleType : 'daily',
            item.timeOfDay,
            item.dayOfWeek,
            now
          )
        : null,
    },
  });
  res.status(202).json({ jobId: job.id, status: job.status });
});

export default router;
