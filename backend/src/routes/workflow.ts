import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

const workflowSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional(),
  isTemplate: z.boolean().optional(),
  steps: z
    .array(
      z.object({
        order: z.number().int().min(1),
        type: z.string().trim().min(1).max(60),
        config: z.any().optional(),
      })
    )
    .min(1)
    .max(50),
});

router.post('/', authenticate, rbac('create_workflow'), async (req: Request, res: Response) => {
  const parse = workflowSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  const userId = (req as any).user.id;
  const wf = await prisma.workflow.create({
    data: {
      userId,
      name: parse.data.name,
      description: parse.data.description,
      isTemplate: parse.data.isTemplate ?? false,
      steps: {
        create: parse.data.steps.map(s => ({ order: s.order, type: s.type, config: s.config })),
      },
    },
    include: { steps: { orderBy: { order: 'asc' } } },
  });
  res.status(201).json(wf);
});

router.get('/', authenticate, rbac('view_own_workflows'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const list = await prisma.workflow.findMany({
    where: { userId },
    include: { steps: { orderBy: { order: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

router.delete('/:id', authenticate, rbac('create_workflow'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const deleted = await prisma.workflow.deleteMany({ where: { id: req.params.id, userId } });
  if (deleted.count === 0) return res.status(404).json({ error: 'Workflow tidak ditemukan' });
  res.json({ message: 'Workflow dihapus' });
});

export default router;
