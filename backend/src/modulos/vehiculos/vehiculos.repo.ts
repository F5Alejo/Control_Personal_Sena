import type pg from 'pg';
import type { Vehiculo } from '../aprendices/aprendices.repo.js';

export type { Vehiculo };

export async function crearVehiculo(pool: pg.Pool, aprendizId: number, d: { placa: string; tipo: string; marca?: string; color?: string }): Promise<Vehiculo> {
  const r = await pool.query(
    'INSERT INTO vehiculos (aprendiz_id, placa, tipo, marca, color) VALUES ($1,$2,$3,$4,$5) RETURNING id, aprendiz_id, placa, tipo, marca, color, activo',
    [aprendizId, d.placa.trim().toUpperCase(), d.tipo, d.marca ?? null, d.color ?? null],
  );
  return r.rows[0];
}

export async function cambiarActivoVehiculo(pool: pg.Pool, id: number, activo: boolean): Promise<Vehiculo | null> {
  const r = await pool.query(
    'UPDATE vehiculos SET activo = $2, fecha_modificacion = now() WHERE id = $1 RETURNING id, aprendiz_id, placa, tipo, marca, color, activo',
    [id, activo],
  );
  return r.rows[0] ?? null;
}
