import { Request, Response, NextFunction } from 'express';

export function rbac(requiredPermission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: 'Tidak terautentikasi' });
    const permissions = user.role?.permissions ?? [];
    if (!permissions.some((p: any) => p.name === requiredPermission)) {
      return res.status(403).json({ error: 'Akses ditolak: permission tidak cukup' });
    }
    next();
  };
}
