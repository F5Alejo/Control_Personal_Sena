import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { servirFrontend } from '../../src/web/estaticos.js';

describe('servirFrontend', () => {
  it('sirve archivos y devuelve index.html en rutas del front, sin tocar /api', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'front-'));
    writeFileSync(join(dir, 'index.html'), '<h1>SPA</h1>'); writeFileSync(join(dir, 'a.js'), 'x');
    const app = express(); app.get('/api/ping', (_q, r) => { r.json({ ok: true }); }); servirFrontend(app, dir);
    expect((await request(app).get('/a.js')).text).toBe('x');
    expect((await request(app).get('/acceso/abc')).text).toBe('<h1>SPA</h1>');
    expect((await request(app).get('/api/ping')).body).toEqual({ ok: true });
    expect((await request(app).get('/api/nada')).status).toBe(404);
    expect((await request(app).get('/socket.io/x')).status).toBe(404);
  });
  it('si la carpeta no existe no hace nada', async () => {
    const app = express(); servirFrontend(app, '/no/existe');
    expect((await request(app).get('/kiosco')).status).toBe(404);
  });
});
