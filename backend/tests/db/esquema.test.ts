import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas } from '../ayudas/bd.js';
import { migrar } from '../../src/db/migrar.js';

const pool = crearPoolPrueba();

async function aprendiz(cedula: string) {
  const r = await pool.query("INSERT INTO aprendices (cedula, nombre) VALUES ($1,'N') RETURNING id", [cedula]);
  return r.rows[0].id as number;
}
async function vehiculo(aid: number, placa: string) {
  const r = await pool.query("INSERT INTO vehiculos (aprendiz_id, placa, tipo) VALUES ($1,$2,'CARRO') RETURNING id", [aid, placa]);
  return r.rows[0].id as number;
}
async function autorizacion(aid: number, vid: number) {
  const r = await pool.query(
    "INSERT INTO autorizaciones_qr (token_hash, aprendiz_id, vehiculo_id, direccion, estado, expira_en) VALUES (md5(random()::text),$1,$2,'ENTRADA','CREADA', now()) RETURNING id",
    [aid, vid],
  );
  return r.rows[0].id as number;
}
async function acceso(aid: number, vid: number, estado: string) {
  const au = await autorizacion(aid, vid);
  return pool.query(
    "INSERT INTO accesos (aprendiz_id, vehiculo_id, espacio_id, autorizacion_id, entrada_en, estado) VALUES ($1,$2,(SELECT id FROM espacios WHERE codigo='P01'),$3, now(), $4)",
    [aid, vid, au, estado],
  );
}

beforeAll(async () => { await migrar(pool); });
beforeEach(async () => { await limpiarTablas(pool); });
afterAll(async () => { await pool.end(); });

describe('esquema', () => {
  it('existen las tablas del esquema', async () => {
    const r = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const nombres = r.rows.map((x) => x.table_name);
    for (const t of ['aprendices', 'vehiculos', 'espacios', 'autorizaciones_qr', 'accesos', 'eventos', 'migraciones'])
      expect(nombres).toContain(t);
  });

  it('P01 queda sembrado como LIBRE', async () => {
    const r = await pool.query("SELECT estado FROM espacios WHERE codigo='P01'");
    expect(r.rows[0].estado).toBe('LIBRE');
  });

  it('rechaza dos accesos activos del mismo vehículo', async () => {
    const a = await aprendiz('1'); const v = await vehiculo(a, 'AAA111');
    await acceso(a, v, 'FINALIZADO');
    await acceso(a, v, 'ENTRANDO');
    await expect(acceso(a, v, 'DENTRO')).rejects.toThrow();
  });

  it('rechaza dos accesos activos en P01 con vehículos distintos', async () => {
    const a = await aprendiz('1'); const v1 = await vehiculo(a, 'AAA111'); const v2 = await vehiculo(a, 'BBB222');
    await acceso(a, v1, 'DENTRO');
    await expect(acceso(a, v2, 'ENTRANDO')).rejects.toThrow();
  });

  it('rechaza cédula y placa duplicadas', async () => {
    const a = await aprendiz('1'); await vehiculo(a, 'AAA111');
    await expect(aprendiz('1')).rejects.toThrow();
    await expect(vehiculo(a, 'AAA111')).rejects.toThrow();
  });
});
