import type pg from 'pg';
import { EstadoHardware } from '../../src/hardware/estado.js';
import { FlujoAcceso } from '../../src/servicios/flujo-acceso.js';
import { cargarConfig } from '../../src/config/env.js';
import { crearAprendiz } from '../../src/modulos/aprendices/aprendices.repo.js';
import { crearVehiculo } from '../../src/modulos/vehiculos/vehiculos.repo.js';
import { consumirToken, crearAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';
import { EmisorFalso, PublicadorFalso, RelojFalso, TemporizadorManual } from '../ayudas/falsos.js';

export async function montarFlujo(pool: pg.Pool, env: Record<string, string> = {}) {
  const reloj = new RelojFalso(); const estado = new EstadoHardware(); const pub = new PublicadorFalso();
  const emisor = new EmisorFalso(); const temp = new TemporizadorManual();
  estado.aplicar({ tipo: 'online', valor: true });
  let n = 0;
  const flujo = new FlujoAcceso({ pool, reloj, estado, publicador: pub, emisor, temporizador: temp, tiempos: cargarConfig({ BARRERA_ABIERTA_MS: '0', ESTACIONAR_MS: '3000', ...env } as NodeJS.ProcessEnv).tiempos, idComando: () => `cmd-${++n}` });
  flujo.iniciar();
  const a = await crearAprendiz(pool, { cedula: '1', nombre: 'Fabio Zorro' });
  const v = await crearVehiculo(pool, a.id, { placa: 'ABC123', tipo: 'CARRO' });
  const deps = { pool, reloj, estado, vigenciaQrSeg: 60 };
  async function autorizar(direccion: 'ENTRADA' | 'SALIDA' = 'ENTRADA') {
    const r = await crearAutorizacion(deps, { aprendizId: a.id, vehiculoId: v.id, direccion });
    if (!r.ok) throw new Error('denegada: ' + r.motivo);
    const c = await consumirToken(deps, r.token);
    if (!c.ok) throw new Error('token: ' + c.motivo);
    await flujo.alConfirmarToken(c.autorizacion.id);
    return c.autorizacion.id;
  }
  const hw = async (m: Parameters<EstadoHardware['aplicar']>[0]) => { estado.aplicar(m); await flujo.esperar(); };
  const avanzar = async (ms: number) => { temp.avanzar(ms); await flujo.esperar(); };
  const estadoAut = async () => (await pool.query('SELECT estado FROM autorizaciones_qr ORDER BY id DESC LIMIT 1')).rows[0]?.estado as string;
  const acceso = async () => (await pool.query('SELECT * FROM accesos ORDER BY id DESC LIMIT 1')).rows[0];
  const eventos = async (tipo: string) => (await pool.query('SELECT detalle FROM eventos WHERE tipo=$1', [tipo])).rows;
  return { reloj, estado, pub, emisor, temp, flujo, a, v, autorizar, hw, avanzar, estadoAut, acceso, eventos };
}

export type Montaje = Awaited<ReturnType<typeof montarFlujo>>;

/** Deja al vehículo DENTRO por el camino normal. Usa los cmd-ids del montaje. */
export async function entrarCompleto(s: Montaje): Promise<void> {
  const antes = s.pub.de('senapark/cmd/barrera').length;
  await s.autorizar('ENTRADA');
  await s.hw({ tipo: 'entrada', presente: true });
  const cmd = s.pub.de('senapark/cmd/barrera')[antes].payload.cmd_id;
  await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: cmd });
  await s.hw({ tipo: 'cruce' });
  await s.avanzar(3000);
  await s.hw({ tipo: 'entrada', presente: false });
}
