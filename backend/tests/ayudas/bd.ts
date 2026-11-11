import pg from 'pg';
import { migrar } from '../../src/db/migrar.js';

export function crearPoolPrueba(): pg.Pool {
  return new pg.Pool({ connectionString: process.env.DATABASE_URL_TEST ?? 'postgres:///senapark_test' });
}

export async function prepararBd(pool: pg.Pool): Promise<void> {
  await migrar(pool);
  await limpiarTablas(pool);
}

export async function limpiarTablas(pool: pg.Pool): Promise<void> {
  await pool.query(
    'TRUNCATE eventos, accesos, autorizaciones_qr, vehiculos, aprendices RESTART IDENTITY CASCADE',
  );
  await pool.query("UPDATE espacios SET estado = 'LIBRE'");
}
