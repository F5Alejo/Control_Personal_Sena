import { createHash, randomBytes } from 'node:crypto';
import type pg from 'pg';
import type { Reloj } from '../../dominio/contratos.js';
import type { Direccion, EstadoAutorizacion } from '../../dominio/tipos.js';
import type { EstadoHardware } from '../../hardware/estado.js';
import { registrarEvento } from '../../eventos/eventos.repo.js';
import { accesoActivoDeVehiculo, espacioLibreId } from '../accesos/accesos.repo.js';

export type MotivoDenegacion =
  | 'APRENDIZ_INACTIVO' | 'VEHICULO_INACTIVO' | 'VEHICULO_NO_PERTENECE' | 'YA_ESTA_DENTRO' | 'NO_ESTA_DENTRO'
  | 'ESPACIO_OCUPADO' | 'AUTORIZACION_ACTIVA' | 'DISPOSITIVO_OFFLINE';

export interface DepsAutorizacion { pool: pg.Pool; reloj: Reloj; estado: EstadoHardware; vigenciaQrSeg: number }
export interface AutorizacionConDatos {
  id: number; direccion: Direccion; estado: EstadoAutorizacion;
  aprendiz: { id: number; nombre: string }; vehiculo: { id: number; placa: string };
}
export type ResultadoCrear = { ok: true; autorizacionId: number; token: string; expiraEn: Date } | { ok: false; motivo: MotivoDenegacion };
export type ResultadoConsumir = { ok: true; autorizacion: AutorizacionConDatos } | { ok: false; motivo: 'TOKEN_INVALIDO' | 'TOKEN_EXPIRADO' | 'TOKEN_USADO' };

const LOCK_AUTORIZACIONES = 727002;
const sha256 = (t: string) => createHash('sha256').update(t).digest('hex');

export async function hayAutorizacionActiva(pool: pg.Pool | pg.PoolClient, reloj: Reloj): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM autorizaciones_qr WHERE (estado = 'CREADA' AND expira_en > $1)
       OR estado IN ('ESPERANDO_VEHICULO','AUTORIZADA','BARRERA_ABIERTA','CRUZANDO') LIMIT 1`, [reloj.ahora()]);
  return r.rowCount! > 0;
}

export function construirUrlAcceso(publicUrl: string | null, token: string, ip: string | null, puerto: number): string {
  const base = publicUrl ? publicUrl.replace(/\/+$/, '') : ip ? `http://${ip}:${puerto}` : null;
  if (!base) throw new Error('No se pudo determinar la IP local; defina PUBLIC_URL en el .env');
  return `${base}/acceso/${token}`;
}

async function validar(c: pg.PoolClient, d: DepsAutorizacion, i: { aprendizId: number; vehiculoId: number; direccion: Direccion }): Promise<MotivoDenegacion | null> {
  const ap = (await c.query('SELECT activo FROM aprendices WHERE id = $1', [i.aprendizId])).rows[0];
  if (!ap || !ap.activo) return 'APRENDIZ_INACTIVO';
  const ve = (await c.query('SELECT activo, aprendiz_id FROM vehiculos WHERE id = $1', [i.vehiculoId])).rows[0];
  if (!ve || ve.aprendiz_id !== i.aprendizId) return 'VEHICULO_NO_PERTENECE';
  if (!ve.activo) return 'VEHICULO_INACTIVO';
  const hw = d.estado.snapshot();
  if (!hw.esp32Online) return 'DISPOSITIVO_OFFLINE';
  if (await hayAutorizacionActiva(c, d.reloj)) return 'AUTORIZACION_ACTIVA';
  const propio = await accesoActivoDeVehiculo(c, i.vehiculoId);
  if (i.direccion === 'ENTRADA') {
    if (propio) return 'YA_ESTA_DENTRO';
    if ((await espacioLibreId(c)) === null) return 'ESPACIO_OCUPADO';
    return null;
  }
  if (!propio || (propio.estado !== 'DENTRO' && propio.estado !== 'SALIENDO')) return 'NO_ESTA_DENTRO';
  return null;
}

export async function crearAutorizacion(d: DepsAutorizacion, i: { aprendizId: number; vehiculoId: number; direccion: Direccion }): Promise<ResultadoCrear> {
  const c = await d.pool.connect();
  let resultado: ResultadoCrear;
  try {
    await c.query('BEGIN');
    await c.query('SELECT pg_advisory_xact_lock($1)', [LOCK_AUTORIZACIONES]);
    const motivo = await validar(c, d, i);
    if (motivo) {
      await c.query('COMMIT');
      resultado = { ok: false, motivo };
    } else {
      const token = randomBytes(32).toString('base64url');
      const expiraEn = new Date(d.reloj.ahora().getTime() + d.vigenciaQrSeg * 1000);
      const r = await c.query(
        `INSERT INTO autorizaciones_qr (token_hash, aprendiz_id, vehiculo_id, direccion, estado, expira_en)
         VALUES ($1,$2,$3,$4,'CREADA',$5) RETURNING id`,
        [sha256(token), i.aprendizId, i.vehiculoId, i.direccion, expiraEn]);
      await c.query('COMMIT');
      resultado = { ok: true, autorizacionId: r.rows[0].id, token, expiraEn };
    }
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
  if (resultado.ok) await registrarEvento(d.pool, 'AUTORIZACION_CREADA', { autorizacionId: resultado.autorizacionId, ...i });
  else await registrarEvento(d.pool, 'ACCESO_DENEGADO', { motivo: resultado.motivo, ...i });
  return resultado;
}

export async function consumirToken(d: DepsAutorizacion, token: string): Promise<ResultadoConsumir> {
  if (!token || token.length > 200) return { ok: false, motivo: 'TOKEN_INVALIDO' };
  const hash = sha256(token);
  const ahora = d.reloj.ahora();
  const r = await d.pool.query(
    `UPDATE autorizaciones_qr SET estado = 'ESPERANDO_VEHICULO', usado_en = $2, fecha_modificacion = now()
     WHERE token_hash = $1 AND estado = 'CREADA' AND usado_en IS NULL AND expira_en > $2 RETURNING id, direccion, estado, aprendiz_id, vehiculo_id`,
    [hash, ahora]);
  if (r.rows[0]) {
    const x = r.rows[0];
    const datos = (await d.pool.query('SELECT a.nombre, v.placa FROM aprendices a, vehiculos v WHERE a.id = $1 AND v.id = $2', [x.aprendiz_id, x.vehiculo_id])).rows[0];
    return { ok: true, autorizacion: { id: x.id, direccion: x.direccion, estado: x.estado, aprendiz: { id: x.aprendiz_id, nombre: datos.nombre }, vehiculo: { id: x.vehiculo_id, placa: datos.placa } } };
  }
  const f = (await d.pool.query('SELECT estado, usado_en, expira_en FROM autorizaciones_qr WHERE token_hash = $1', [hash])).rows[0];
  if (!f) return { ok: false, motivo: 'TOKEN_INVALIDO' };
  if (f.usado_en) return { ok: false, motivo: 'TOKEN_USADO' };
  if (f.estado === 'CREADA' && new Date(f.expira_en) <= ahora) {
    await d.pool.query("UPDATE autorizaciones_qr SET estado = 'EXPIRADA', fecha_modificacion = now() WHERE token_hash = $1 AND estado = 'CREADA'", [hash]);
    return { ok: false, motivo: 'TOKEN_EXPIRADO' };
  }
  if (f.estado === 'EXPIRADA') return { ok: false, motivo: 'TOKEN_EXPIRADO' };
  return { ok: false, motivo: 'TOKEN_USADO' };
}
