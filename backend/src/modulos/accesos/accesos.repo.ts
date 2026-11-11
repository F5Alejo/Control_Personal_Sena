import type pg from 'pg';
import type { EstadoAcceso } from '../../dominio/tipos.js';

export interface Acceso {
  id: number; aprendizId: number; vehiculoId: number; espacioId: number; autorizacionId: number;
  entradaEn: Date; salidaEn: Date | null; estado: EstadoAcceso;
}
export interface AccesoConNombres extends Acceso { aprendizNombre: string; placa: string }

const mapear = (r: any): Acceso => ({
  id: r.id, aprendizId: r.aprendiz_id, vehiculoId: r.vehiculo_id, espacioId: r.espacio_id,
  autorizacionId: r.autorizacion_id, entradaEn: r.entrada_en, salidaEn: r.salida_en, estado: r.estado,
});
const ACTIVOS = "('ENTRANDO','DENTRO','SALIENDO')";

export async function accesoActivoDeVehiculo(pool: pg.Pool | pg.PoolClient, vehiculoId: number): Promise<Acceso | null> {
  const r = await pool.query(`SELECT * FROM accesos WHERE vehiculo_id = $1 AND estado IN ${ACTIVOS}`, [vehiculoId]);
  return r.rows[0] ? mapear(r.rows[0]) : null;
}

export async function accesoActivoEnP01(pool: pg.Pool | pg.PoolClient): Promise<Acceso | null> {
  const r = await pool.query(`SELECT a.* FROM accesos a JOIN espacios e ON e.id = a.espacio_id WHERE e.codigo = 'P01' AND a.estado IN ${ACTIVOS}`);
  return r.rows[0] ? mapear(r.rows[0]) : null;
}

export async function listarAccesos(pool: pg.Pool, limite: number): Promise<AccesoConNombres[]> {
  const r = await pool.query(
    `SELECT a.*, p.nombre AS aprendiz_nombre, v.placa FROM accesos a
     JOIN aprendices p ON p.id = a.aprendiz_id JOIN vehiculos v ON v.id = a.vehiculo_id
     ORDER BY a.id DESC LIMIT $1`, [limite]);
  return r.rows.map((x) => ({ ...mapear(x), aprendizNombre: x.aprendiz_nombre, placa: x.placa }));
}
