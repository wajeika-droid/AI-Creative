import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { verify } from 'jsonwebtoken';

const prisma = new PrismaClient();

/**
 * Middleware untuk memeriksa apakah user yang ter‑auth memiliki permission tertentu.
 * Penggunaan contoh:
 *   app.get('/admin/users', rbac('manage_users'), handler);
 */
export function rbac(requiredPermission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token tidak ada' });
      }
      const token = authHeader.split(' ')[1];
      const payload = verify(token, process.env.JWT_SECRET as string) as any;
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: { include: { permissions: true } } },
      });
      if (!user) return res.status(401).json({ error: 'User tidak ditemukan' });

      const hasPerm = user.role.permissions.some(p => p.name === requiredPermission);
      if (!hasPerm) {
        return res.status(403).json({ error: 'Akses ditolak: permission tidak cukup' });
      }
      // Simpan user di request untuk handler selanjutnya
      (req as any).user = user;
      next();
    } catch (err) {
      console.error('RBAC error:', err);
      return res.status(401).json({ error: 'Token tidak valid' });
    }
  };
}

