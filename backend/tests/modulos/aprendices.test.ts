import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { appPrueba } from '../ayudas/app.js';

const pool = crearPoolPrueba();
const app = appPrueba(pool);
beforeAll(() => prepararBd(pool));
beforeEach(() => limpiarTablas(pool));
afterAll(() => pool.end());

const dto = { cedula: '1000000001', nombre: 'Fabio Zorro', ficha: '2900001' };

describe('aprendices', () => {
  it('crea un aprendiz y lo encuentra por cédula', async () => {
    const c = await request(app).post('/api/aprendices').send(dto);
    expect(c.status).toBe(201);
    const b = await request(app).get('/api/aprendices').query({ cedula: '1000000001' });
    expect(b.status).toBe(200);
    expect(b.body.aprendiz.nombre).toBe('Fabio Zorro');
    expect(b.body.vehiculos).toEqual([]);
  });
  it('busca ignorando espacios alrededor de la cédula', async () => {
    await request(app).post('/api/aprendices').send(dto);
    const b = await request(app).get('/api/aprendices').query({ cedula: ' 1000000001 ' });
    expect(b.status).toBe(200);
  });
  it('404 si la cédula no existe', async () => {
    const b = await request(app).get('/api/aprendices').query({ cedula: '999' });
    expect(b.status).toBe(404);
    expect(b.body.error).toBe('Aprendiz no encontrado');
  });
  it('409 si la cédula ya está registrada', async () => {
    await request(app).post('/api/aprendices').send(dto);
    const c = await request(app).post('/api/aprendices').send(dto);
    expect(c.status).toBe(409);
  });
  it('400 si falta nombre o cédula', async () => {
    expect((await request(app).post('/api/aprendices').send({ cedula: '1' })).status).toBe(400);
    expect((await request(app).post('/api/aprendices').send({ nombre: 'x' })).status).toBe(400);
  });
  it('actualiza un aprendiz', async () => {
    const c = await request(app).post('/api/aprendices').send(dto);
    const u = await request(app).put(`/api/aprendices/${c.body.id}`).send({ nombre: 'Otro Nombre' });
    expect(u.status).toBe(200);
    expect(u.body.nombre).toBe('Otro Nombre');
  });
});
