import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';
import { z } from 'zod';

const router = Router();
const prisma = new PrismaClient();

const createTeamSchema = z.object({
  name: z.string(),
});

router.post('/', authenticate, rbac('create_team'), async (req: Request, res: Response) => {
  const parse = createTeamSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  const ownerId = (req as any).user.id;
  const team = await prisma.team.create({ data: { name: parse.data.name, ownerId } });
  await prisma.teamMember.create({ data: { teamId: team.id, userId: ownerId, role: 'Leader' } });
  res.status(201).json(team);
});

router.get('/', authenticate, rbac('view_own_teams'), async (req: Request, res: Response) => {
  const ownerId = (req as any).user.id;
  const teams = await prisma.team.findMany({
    where: { ownerId },
    include: { members: true },
  });
  res.json(teams);
});

export default router;

