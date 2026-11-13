import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware untuk memverifikasi JWT dan menambahkan objek user ke request.
 * Dipakai pada semua route yang membutuhkan autentikasi.
 */
export function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token tidak ada' });
    }
    const token = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    // Ambil user beserta role & permission
    prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    })
      .then(user => {
        if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });
        (req as any).user = user;
        next();
      })
      .catch(err => {
        console.error('Auth DB error:', err);
        res.status(500).json({ error: 'Internal server error' });
      });
  } catch (err) {
    console.error('Auth error:', err);
    res.status(401).json({ error: 'Token tidak valid' });
  }
}

