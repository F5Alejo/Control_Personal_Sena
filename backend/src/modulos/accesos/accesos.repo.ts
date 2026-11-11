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

/** Id del primer puesto activo sin ningún acceso en curso, o null si el parqueadero está lleno. */
export async function espacioLibreId(pool: pg.Pool | pg.PoolClient, opciones: { sinP01?: boolean } = {}): Promise<number | null> {
  const r = await pool.query(
    `SELECT e.id FROM espacios e WHERE e.activo${opciones.sinP01 ? " AND e.codigo <> 'P01'" : ''}
       AND NOT EXISTS (SELECT 1 FROM accesos a WHERE a.espacio_id = e.id AND a.estado IN ${ACTIVOS})
     ORDER BY e.codigo LIMIT 1`);
  return r.rows[0]?.id ?? null;
}

export interface EspacioOcupado { codigo: string; ocupado: boolean; placa: string | null; tipo: string | null; aprendiz: string | null }

/** Todos los puestos con quién los ocupa (accesos DENTRO o SALIENDO). */
export async function listarEspacios(pool: pg.Pool | pg.PoolClient): Promise<EspacioOcupado[]> {
  const r = await pool.query(
    `SELECT e.codigo, v.placa, v.tipo, p.nombre AS aprendiz FROM espacios e
     LEFT JOIN accesos a ON a.espacio_id = e.id AND a.estado IN ('DENTRO','SALIENDO')
     LEFT JOIN vehiculos v ON v.id = a.vehiculo_id LEFT JOIN aprendices p ON p.id = a.aprendiz_id
     WHERE e.activo ORDER BY e.codigo`);
  return r.rows.map((x) => ({ codigo: x.codigo, ocupado: x.placa != null, placa: x.placa ?? null, tipo: x.tipo ?? null, aprendiz: x.aprendiz ?? null }));
}

export async function listarAccesos(pool: pg.Pool, limite: number): Promise<AccesoConNombres[]> {
  const r = await pool.query(
    `SELECT a.*, p.nombre AS aprendiz_nombre, v.placa FROM accesos a
     JOIN aprendices p ON p.id = a.aprendiz_id JOIN vehiculos v ON v.id = a.vehiculo_id
     ORDER BY a.id DESC LIMIT $1`, [limite]);
  return r.rows.map((x) => ({ ...mapear(x), aprendizNombre: x.aprendiz_nombre, placa: x.placa }));
}
