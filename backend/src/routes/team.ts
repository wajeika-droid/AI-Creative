import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { rbac } from '../middleware/rbac';

const router = Router();

const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const memberSchema = z.object({
  email: z.string().email(),
});

router.post('/', authenticate, rbac('create_team'), async (req: Request, res: Response) => {
  const parse = createTeamSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  const ownerId = (req as any).user.id;

  const team = await prisma.$transaction(async tx => {
    const created = await tx.team.create({ data: { name: parse.data.name, ownerId } });
    await tx.teamMember.create({ data: { teamId: created.id, userId: ownerId, role: 'Leader' } });
    return created;
  });

  res.status(201).json(team);
});

router.get('/', authenticate, rbac('view_own_teams'), async (req: Request, res: Response) => {
  const ownerId = (req as any).user.id;
  const teams = await prisma.team.findMany({
    where: { ownerId },
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { email: true } },
      members: { include: { user: { select: { email: true } } } },
    },
  });
  res.json(teams);
});

router.post('/:id/members', authenticate, rbac('create_team'), async (req: Request, res: Response) => {
  const parse = memberSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: 'Email tidak valid' });

  const ownerId = (req as any).user.id;
  const team = await prisma.team.findFirst({ where: { id: req.params.id, ownerId } });
  if (!team) return res.status(404).json({ error: 'Tim tidak ditemukan' });

  const user = await prisma.user.findUnique({
    where: { email: parse.data.email },
    select: { id: true, email: true },
  });
  if (!user) return res.status(404).json({ error: 'Pengguna dengan email tersebut belum terdaftar' });

  const member = await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    update: {},
    create: { teamId: team.id, userId: user.id, role: 'Member' },
    include: { user: { select: { email: true } } },
  });
  res.status(201).json(member);
});

router.delete(
  '/:id/members/:userId',
  authenticate,
  rbac('create_team'),
  async (req: Request, res: Response) => {
    const ownerId = (req as any).user.id;
    const team = await prisma.team.findFirst({ where: { id: req.params.id, ownerId } });
    if (!team) return res.status(404).json({ error: 'Tim tidak ditemukan' });
    if (req.params.userId === ownerId) {
      return res.status(400).json({ error: 'Pemilik tim tidak dapat dikeluarkan' });
    }
    const deleted = await prisma.teamMember.deleteMany({
      where: { teamId: team.id, userId: req.params.userId },
    });
    if (deleted.count === 0) return res.status(404).json({ error: 'Anggota tidak ditemukan' });
    res.json({ message: 'Anggota dikeluarkan dari tim' });
  }
);

export default router;
