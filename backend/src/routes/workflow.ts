import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const workflowSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  isTemplate: z.boolean().optional(),
  steps: z.array(
    z.object({
      order: z.number(),
      type: z.string(),
      config: z.any().optional(),
    })
  ),
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
    include: { steps: true },
  });
  res.status(201).json(wf);
});

router.get('/', authenticate, rbac('view_own_workflows'), async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const list = await prisma.workflow.findMany({ where: { userId }, include: { steps: true } });
  res.json(list);
});

export default router;

