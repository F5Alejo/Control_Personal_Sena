import { describe, expect, it, vi } from 'vitest';
import { esLoopback, soloLocal } from '../../src/web/solo-local.js';

const llamar = (ip: string | undefined) => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }; const next = vi.fn();
  soloLocal({ socket: { remoteAddress: ip } } as never, res as never, next);
  return { res, next };
};

describe('soloLocal', () => {
  it('reconoce direcciones loopback', () => {
    for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) expect(esLoopback(ip)).toBe(true);
    for (const ip of ['192.168.1.20', '::ffff:10.0.0.5', '', undefined]) expect(esLoopback(ip)).toBe(false);
  });
  it('deja pasar a localhost', () => { const { next, res } = llamar('127.0.0.1'); expect(next).toHaveBeenCalled(); expect(res.status).not.toHaveBeenCalled(); });
  it('responde 403 a un equipo de la red', () => { const { next, res } = llamar('192.168.1.20'); expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403); });
});
