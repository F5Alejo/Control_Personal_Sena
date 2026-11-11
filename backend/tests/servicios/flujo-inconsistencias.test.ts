import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { crearAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';
import { entrarCompleto, montarFlujo, type Montaje } from './ayudas-flujo.js';

const pool = crearPoolPrueba();
let s: Montaje;
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool); });

describe('inconsistencias sin flujo activo', () => {
  it('P01 ocupado sin acceso registra P01_OCUPADO_SIN_ACCESO una sola vez', async () => {
    await s.hw({ tipo: 'p01', ocupado: true });
    await s.hw({ tipo: 'p01', ocupado: true });
    expect(await s.eventos('P01_OCUPADO_SIN_ACCESO')).toHaveLength(1);
    expect(await s.flujo.bloqueoP01()).toBe(true);
    const r = await crearAutorizacion({ pool, reloj: s.reloj, estado: s.estado, vigenciaQrSeg: 60 }, { aprendizId: s.a.id, vehiculoId: s.v.id, direccion: 'ENTRADA' });
    expect(r).toEqual({ ok: false, motivo: 'P01_BLOQUEADO_INCONSISTENCIA' });
  });
  it('P01 libre con acceso DENTRO registra P01_LIBERADO_SIN_SALIDA', async () => {
    await entrarCompleto(s);
    await s.hw({ tipo: 'p01', ocupado: false });
    expect(await s.eventos('P01_LIBERADO_SIN_SALIDA')).toHaveLength(1);
  });
  it('el flujo normal de entrada no genera eventos de inconsistencia', async () => {
    await entrarCompleto(s);
    expect(await s.eventos('P01_OCUPADO_SIN_ACCESO')).toHaveLength(0);
    expect(await s.flujo.bloqueoP01()).toBe(false);
  });
  it('apertura manual publica abrir, registra el evento y cierra después', async () => {
    await s.flujo.aperturaManual('Prueba del celador');
    expect(s.pub.de('senapark/cmd/barrera')[0].payload).toMatchObject({ accion: 'abrir', expira_en_ms: 5000 });
    expect((await s.eventos('APERTURA_MANUAL'))[0].detalle.motivo).toBe('Prueba del celador');
    await s.avanzar(15000);
    expect(s.pub.de('senapark/cmd/barrera').map((m: any) => m.payload.accion)).toEqual(['abrir', 'cerrar']);
  });
  it('la solicitud manual del hardware queda como evento SOLICITUD_MANUAL y no abre nada', async () => {
    await s.hw({ tipo: 'manual', solicitud: 'apertura' });
    expect(await s.eventos('SOLICITUD_MANUAL')).toHaveLength(1);
    expect(s.pub.de('senapark/cmd/barrera')).toHaveLength(0);
  });
});
