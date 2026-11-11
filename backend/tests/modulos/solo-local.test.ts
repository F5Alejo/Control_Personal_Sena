import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { appPrueba } from '../ayudas/app.js';
import { crearPoolPrueba } from '../ayudas/bd.js';
import { esLoopback, soloLocal } from '../../src/web/solo-local.js';
import { origenPermitido, salaDe } from '../../src/tiempo-real/socket.js';

const llamar = (ip: string | undefined, headers: Record<string, string> = { host: 'localhost:3000' }) => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() }; const next = vi.fn();
  soloLocal({ socket: { remoteAddress: ip }, headers } as never, res as never, next);
  return { res, next };
};

describe('soloLocal', () => {
  it('reconoce direcciones loopback', () => {
    for (const ip of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) expect(esLoopback(ip)).toBe(true);
    for (const ip of ['192.168.1.20', '::ffff:10.0.0.5', '', undefined]) expect(esLoopback(ip)).toBe(false);
  });
  it('deja pasar a localhost', () => { const { next, res } = llamar('127.0.0.1'); expect(next).toHaveBeenCalled(); expect(res.status).not.toHaveBeenCalled(); });
  it('responde 403 a un equipo de la red', () => { const { next, res } = llamar('192.168.1.20'); expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403); });
  it('responde 403 si el Host no es local (DNS rebinding)', () => { const { next, res } = llamar('127.0.0.1', { host: 'malo.example:3000' }); expect(next).not.toHaveBeenCalled(); expect(res.status).toHaveBeenCalledWith(403); });
  it('responde 403 si el Origin es de otro sitio (CSRF) y deja pasar el local', () => {
    expect(llamar('127.0.0.1', { host: 'localhost:3000', origin: 'http://malo.example' }).res.status).toHaveBeenCalledWith(403);
    expect(llamar('127.0.0.1', { host: 'localhost:3000', origin: 'http://localhost:4200' }).next).toHaveBeenCalled();
  });
});

describe('API restringida al equipo local', () => {
  const pool = crearPoolPrueba(); const app = appPrueba(pool);
  afterAll(() => pool.end());
  it.each([['get', '/api/estado'], ['get', '/api/accesos'], ['get', '/api/eventos'], ['get', '/api/aprendices?cedula=1'], ['post', '/api/autorizaciones'], ['post', '/api/demo/reiniciar'], ['post', '/api/barrera/abrir-manual']])(
    '%s %s da 403 con Host ajeno', async (m, ruta) => {
      const r = await (request(app) as any)[m](ruta).set('Host', 'malo.example');
      expect(r.status).toBe(403);
    });
  it('confirmar el QR sigue abierto a la red (el celular lo usa)', async () => {
    const r = await request(app).post('/api/acceso/falso/confirmar').set('Host', '192.168.1.10:3000');
    expect(r.status).toBe(404);
  });
});

describe('Socket.IO por salas', () => {
  it('el equipo local va a la sala panel y el resto a movil', () => {
    expect(salaDe('127.0.0.1')).toBe('panel'); expect(salaDe('::1')).toBe('panel');
    expect(salaDe('192.168.1.20')).toBe('movil'); expect(salaDe(undefined)).toBe('movil');
  });
  it('con Host ajeno (DNS rebinding) un equipo local queda en la sala movil', () => {
    expect(salaDe('127.0.0.1', 'localhost:3000')).toBe('panel');
    expect(salaDe('127.0.0.1', 'malo.example:3000')).toBe('movil');
  });
  it('rechaza el Origin de otro sitio y acepta sin Origin o del mismo host', () => {
    expect(origenPermitido(undefined, 'localhost:3000')).toBe(true);
    expect(origenPermitido('http://192.168.1.10:3000', '192.168.1.10:3000')).toBe(true);
    expect(origenPermitido('http://malo.example', 'localhost:3000')).toBe(false);
  });
});
