import type pg from 'pg';
import type { TipoEvento } from '../dominio/tipos.js';

export interface EventoSistema { id: number; tipo: string; detalle: Record<string, unknown>; fecha: Date }

export async function registrarEvento(pool: pg.Pool | pg.PoolClient, tipo: TipoEvento, detalle: object = {}): Promise<EventoSistema> {
  const r = await pool.query('INSERT INTO eventos (tipo, detalle) VALUES ($1,$2) RETURNING id, tipo, detalle, fecha', [tipo, JSON.stringify(detalle)]);
  return r.rows[0];
}

export async function listarEventos(pool: pg.Pool, limite: number): Promise<EventoSistema[]> {
  const r = await pool.query('SELECT id, tipo, detalle, fecha FROM eventos ORDER BY id DESC LIMIT $1', [limite]);
  return r.rows;
}
