import type { NextFunction, Request, Response } from 'express';

export const esLoopback = (ip?: string): boolean => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

/** Las rutas de administración solo responden desde el propio equipo (no hay login en el kiosco). */
export function soloLocal(req: Request, res: Response, next: NextFunction): void {
  if (esLoopback(req.socket.remoteAddress)) { next(); return; }
  res.status(403).json({ error: 'Esta acción solo se puede hacer desde el equipo del celador' });
}
