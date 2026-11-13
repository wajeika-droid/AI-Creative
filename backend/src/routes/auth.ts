import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(userId: string, roleId: string) {
  return jwt.sign({ sub: userId, role: roleId }, process.env.JWT_SECRET as string, {
    expiresIn: '7d',
  });
}

router.post('/signup', async (req: Request, res: Response) => {
  const parse = signupSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  }
  const { email, password } = parse.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const role = await prisma.role.findUnique({ where: { name: 'Content Creator' } });
  if (!role) {
    return res.status(503).json({ error: 'Role default belum tersedia, jalankan seed terlebih dahulu' });
  }
  const hash = await bcrypt.hash(password, 12);
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 1);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      role: { connect: { id: role.id } },
      wallet: { create: {} },
      subscription: { create: { plan: 'Free', tokenQuota: 5000, endDate } },
    },
    select: { id: true, email: true, role: { select: { id: true, name: true } } },
  });
  const token = signToken(user.id, role.id);
  res.status(201).json({ token, user });
});

router.post('/login', async (req: Request, res: Response) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid input', details: parse.error.format() });
  }
  const { email, password } = parse.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: { select: { id: true, name: true } } },
  });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken(user.id, user.roleId);
  res.json({
    token,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = (req as any).user;
  res.json({
    id: user.id,
    email: user.email,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: user.role.permissions.map((p: any) => p.name),
    },
  });
});

export default router;
