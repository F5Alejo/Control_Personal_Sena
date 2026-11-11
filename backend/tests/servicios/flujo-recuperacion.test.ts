import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { crearAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';
import { entrarCompleto, montarFlujo, type Montaje } from './ayudas-flujo.js';

const pool = crearPoolPrueba();
let s: Montaje;
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool); });

const activos = async () => (await pool.query("SELECT count(*)::int n FROM accesos WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO')")).rows[0].n;
const abrirs = () => s.pub.de('senapark/cmd/barrera').filter((m: any) => m.payload.accion === 'abrir').length;

describe('caídas', () => {
  it('ESP32 offline a mitad de la entrada deja ERROR_MQTT y ningún acceso activo', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'online', valor: false });
    expect(await s.estadoAut()).toBe('ERROR_MQTT');
    expect(await activos()).toBe(0);
    expect(await s.eventos('ESP32_OFFLINE')).toHaveLength(1);
    expect(s.flujo.autorizacionActiva()).toBeNull();
  });
  it('alPerderMqtt con salida en curso devuelve el acceso a DENTRO', async () => {
    await entrarCompleto(s);
    await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
    expect((await s.acceso()).estado).toBe('SALIENDO');
    await s.flujo.alPerderMqtt(); await s.flujo.esperar();
    expect((await s.acceso()).estado).toBe('DENTRO');
    expect(await s.estadoAut()).toBe('ERROR_MQTT');
  });
  it('tras offline no se publica ningún comando de abrir', async () => {
    await s.autorizar();
    await s.hw({ tipo: 'online', valor: false });
    await s.hw({ tipo: 'entrada', presente: true });
    expect(abrirs()).toBe(0);
  });
  it('al volver online registra ESP32_ONLINE', async () => {
    await s.hw({ tipo: 'online', valor: false }); await s.hw({ tipo: 'online', valor: true });
    expect(await s.eventos('ESP32_OFFLINE')).toHaveLength(1);
    expect(await s.eventos('ESP32_ONLINE')).toHaveLength(1);
  });
});

describe('recuperación al arrancar', () => {
  it('cierra autorizaciones y accesos intermedios y registra un único RECUPERACION_ARRANQUE', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.flujo.recuperarAlArrancar();
    expect(await activos()).toBe(0);
    expect(await s.estadoAut()).toBe('EXPIRADA');
    const ev = await s.eventos('RECUPERACION_ARRANQUE');
    expect(ev).toHaveLength(1);
    expect(ev[0].detalle).toMatchObject({ autorizaciones: 1, accesosAnulados: 1, accesosRestaurados: 0 });
    expect(s.flujo.autorizacionActiva()).toBeNull();
  });
  it('un acceso SALIENDO vuelve a DENTRO', async () => {
    await entrarCompleto(s);
    await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
    await s.flujo.recuperarAlArrancar();
    expect((await s.acceso()).estado).toBe('DENTRO');
  });
  it('sin nada pendiente no registra evento', async () => {
    await s.flujo.recuperarAlArrancar();
    expect(await s.eventos('RECUPERACION_ARRANQUE')).toHaveLength(0);
  });
  it('después de recuperar, el mismo vehículo puede volver a entrar', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.flujo.recuperarAlArrancar();
    const r = await crearAutorizacion({ pool, reloj: s.reloj, estado: s.estado, vigenciaQrSeg: 60 }, { aprendizId: s.a.id, vehiculoId: s.v.id, direccion: 'ENTRADA' });
    expect(r.ok).toBe(true);
  });
});

describe('reiniciar demo', () => {
  it('deja el sistema listo para otro ensayo', async () => {
    await entrarCompleto(s);
    await s.hw({ tipo: 'p01', ocupado: false });
    await s.flujo.reiniciarDemo();
    expect(await activos()).toBe(0);
    expect((await pool.query("SELECT estado FROM espacios WHERE codigo='P01'")).rows[0].estado).toBe('LIBRE');
    expect(await s.eventos('DEMO_REINICIADA')).toHaveLength(1);
    await entrarCompleto(s);
    expect((await s.acceso()).estado).toBe('DENTRO');
  });
  it('reiniciar en mitad de un flujo cancela sus temporizadores', async () => {
    await s.autorizar();
    await s.flujo.reiniciarDemo();
    expect(s.flujo.autorizacionActiva()).toBeNull();
    await s.avanzar(60000);
    expect(await s.eventos('AUTORIZADO_SIN_VEHICULO')).toHaveLength(0);
  });
});
