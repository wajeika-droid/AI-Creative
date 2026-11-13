import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ada' });
    }
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    if (!payload?.sub) {
      return res.status(401).json({ error: 'Token tidak valid' });
    }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });
    (req as any).user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}
