import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { appPrueba } from '../ayudas/app.js';

const pool = crearPoolPrueba();
const app = appPrueba(pool);
let aid: number;
beforeAll(() => prepararBd(pool));
beforeEach(async () => {
  await limpiarTablas(pool);
  aid = (await request(app).post('/api/aprendices').send({ cedula: '1', nombre: 'A' })).body.id;
});
afterAll(() => pool.end());

describe('vehículos', () => {
  it('registra un vehículo con placa en mayúsculas', async () => {
    const r = await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'abc123', tipo: 'CARRO' });
    expect(r.status).toBe(201);
    expect(r.body.placa).toBe('ABC123');
  });
  it('409 si la placa está repetida', async () => {
    await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'abc123', tipo: 'CARRO' });
    const r = await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'ABC123', tipo: 'MOTO' });
    expect(r.status).toBe(409);
  });
  it('un aprendiz puede tener varios vehículos', async () => {
    await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'AAA111', tipo: 'CARRO' });
    await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'BBB222', tipo: 'MOTO' });
    const b = await request(app).get('/api/aprendices').query({ cedula: '1' });
    expect(b.body.vehiculos).toHaveLength(2);
  });
  it('desactivar un vehículo lo deja fuera de la lista de activos', async () => {
    const v = await request(app).post(`/api/aprendices/${aid}/vehiculos`).send({ placa: 'AAA111', tipo: 'CARRO' });
    const p = await request(app).patch(`/api/vehiculos/${v.body.id}`).send({ activo: false });
    expect(p.status).toBe(200);
    const b = await request(app).get('/api/aprendices').query({ cedula: '1' });
    expect(b.body.vehiculos).toHaveLength(0);
  });
});
