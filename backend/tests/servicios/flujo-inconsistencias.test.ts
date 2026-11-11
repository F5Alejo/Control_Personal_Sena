import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { consumirToken, crearAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';
import { entrarCompleto, montarFlujo, type Montaje } from './ayudas-flujo.js';

const pool = crearPoolPrueba();
let s: Montaje;
const deps = () => ({ pool, reloj: s.reloj, estado: s.estado, vigenciaQrSeg: 60 });
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool); });

describe('casos sueltos del flujo', () => {
  it('un cruce sin autorización activa se ignora', async () => {
    await s.hw({ tipo: 'cruce' });
    expect(s.flujo.autorizacionActiva()).toBeNull();
    expect((await pool.query('SELECT count(*)::int n FROM accesos')).rows[0].n).toBe(0);
  });
  it('P01 refleja la base de datos: ocupado tras entrar, libre al reiniciar la demo', async () => {
    await entrarCompleto(s);
    expect(s.estado.snapshot().p01Ocupado).toBe(true);
    await s.flujo.reiniciarDemo();
    expect(s.estado.snapshot().p01Ocupado).toBe(false);
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
  it('ESP32 offline al escanear el QR cierra la autorización con ERROR_MQTT', async () => {
    const r = await crearAutorizacion(deps(), { aprendizId: s.a.id, vehiculoId: s.v.id, direccion: 'ENTRADA' });
    if (!r.ok) throw new Error('denegada');
    await s.hw({ tipo: 'online', valor: false });
    const c = await consumirToken(deps(), r.token);
    if (!c.ok) throw new Error('token');
    await s.flujo.alConfirmarToken(c.autorizacion.id);
    await s.flujo.esperar();
    expect(await s.estadoAut()).toBe('ERROR_MQTT');
    expect(s.flujo.autorizacionActiva()).toBeNull();
    expect(s.pub.de('senapark/cmd/barrera')).toHaveLength(0);
  });
});
