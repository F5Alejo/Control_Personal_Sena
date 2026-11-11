import type { NextFunction, Request, Response } from 'express';

export const esLoopback = (ip?: string): boolean => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

const NOMBRES_LOCALES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
export const hostnameDe = (v: string): string => {
  try { return new URL(v.includes('://') ? v : `http://${v}`).hostname; } catch { return ''; }
};
export const esNombreLocal = (v: string) => NOMBRES_LOCALES.has(hostnameDe(v));

/**
 * Acciones del celador: solo desde el propio equipo (no hay login en el kiosco). Además de la IP se exigen
 * Host local (contra DNS rebinding) y Origin local si viene (contra CSRF desde otra página abierta en el navegador).
 */
export function soloLocal(req: Request, res: Response, next: NextFunction): void {
  const host = req.headers.host ?? ''; const origen = req.headers.origin;
  if (esLoopback(req.socket.remoteAddress) && esNombreLocal(host) && (origen === undefined || esNombreLocal(origen))) { next(); return; }
  res.status(403).json({ error: 'Esta acción solo se puede hacer desde el equipo del celador' });
}
