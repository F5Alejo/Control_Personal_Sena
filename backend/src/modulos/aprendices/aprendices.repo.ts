import type pg from 'pg';

export interface Aprendiz { id: number; cedula: string; nombre: string; ficha: string | null; programa: string | null; jornada: string | null; activo: boolean }
export interface Vehiculo { id: number; aprendiz_id: number; placa: string; tipo: string; marca: string | null; color: string | null; activo: boolean }

const COLS_A = 'id, cedula, nombre, ficha, programa, jornada, activo';
const COLS_V = 'id, aprendiz_id, placa, tipo, marca, color, activo';

export async function crearAprendiz(pool: pg.Pool, d: { cedula: string; nombre: string; ficha?: string; programa?: string; jornada?: string }): Promise<Aprendiz> {
  const r = await pool.query(
    `INSERT INTO aprendices (cedula, nombre, ficha, programa, jornada) VALUES ($1,$2,$3,$4,$5) RETURNING ${COLS_A}`,
    [d.cedula.trim(), d.nombre.trim(), d.ficha ?? null, d.programa ?? null, d.jornada ?? null],
  );
  return r.rows[0];
}

export async function actualizarAprendiz(pool: pg.Pool, id: number, d: Partial<{ nombre: string; ficha: string; programa: string; jornada: string; activo: boolean }>): Promise<Aprendiz | null> {
  const r = await pool.query(
    `UPDATE aprendices SET nombre = COALESCE($2, nombre), ficha = COALESCE($3, ficha), programa = COALESCE($4, programa),
       jornada = COALESCE($5, jornada), activo = COALESCE($6, activo), fecha_modificacion = now()
     WHERE id = $1 RETURNING ${COLS_A}`,
    [id, d.nombre ?? null, d.ficha ?? null, d.programa ?? null, d.jornada ?? null, d.activo ?? null],
  );
  return r.rows[0] ?? null;
}

export async function buscarAprendizPorCedula(pool: pg.Pool, cedula: string): Promise<Aprendiz | null> {
  const r = await pool.query(`SELECT ${COLS_A} FROM aprendices WHERE cedula = $1`, [cedula.trim()]);
  return r.rows[0] ?? null;
}

export async function vehiculosActivos(pool: pg.Pool, aprendizId: number): Promise<Vehiculo[]> {
  const r = await pool.query(`SELECT ${COLS_V} FROM vehiculos WHERE aprendiz_id = $1 AND activo ORDER BY id`, [aprendizId]);
  return r.rows;
}
