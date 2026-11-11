import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type pg from 'pg';

const carpeta = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migraciones');

export async function migrar(pool: pg.Pool): Promise<void> {
  const cliente = await pool.connect();
  try {
    await cliente.query('SELECT pg_advisory_lock(727001)');
    await cliente.query('CREATE TABLE IF NOT EXISTS migraciones (nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())');
    const hechas = new Set((await cliente.query('SELECT nombre FROM migraciones')).rows.map((r) => r.nombre));
    const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.sql')).sort();
    for (const f of archivos) {
      if (hechas.has(f)) continue;
      await cliente.query('BEGIN');
      try {
        await cliente.query(await readFile(path.join(carpeta, f), 'utf8'));
        await cliente.query('INSERT INTO migraciones (nombre) VALUES ($1)', [f]);
        await cliente.query('COMMIT');
      } catch (e) {
        await cliente.query('ROLLBACK');
        throw e;
      }
    }
  } finally {
    await cliente.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    cliente.release();
  }
}
