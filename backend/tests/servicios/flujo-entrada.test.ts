import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { entrarCompleto, montarFlujo } from './ayudas-flujo.js';
import { crearAprendiz } from '../../src/modulos/aprendices/aprendices.repo.js';
import { crearVehiculo } from '../../src/modulos/vehiculos/vehiculos.repo.js';
import { consumirToken, crearAutorizacion } from '../../src/modulos/autorizaciones/autorizaciones.servicio.js';

const pool = crearPoolPrueba();
let s: Awaited<ReturnType<typeof montarFlujo>>;
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool); });

const barrera = (s: any) => s.pub.de('senapark/cmd/barrera').map((m: any) => m.payload);

describe('flujo de entrada', () => {
  it('camino feliz: confirmar, vehículo, apertura, cruce y 3 s después el acceso queda DENTRO', async () => {
    await s.autorizar();
    expect(await s.estadoAut()).toBe('ESPERANDO_VEHICULO');
    await s.hw({ tipo: 'entrada', presente: true });
    expect(await s.estadoAut()).toBe('AUTORIZADA');
    const abrir = barrera(s)[0];
    expect(abrir).toMatchObject({ cmd_id: 'cmd-1', accion: 'abrir', expira_en_ms: 5000 });
    expect((await s.acceso()).estado).toBe('ENTRANDO');
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' });
    expect(await s.estadoAut()).toBe('BARRERA_ABIERTA');
    await s.hw({ tipo: 'cruce' });
    expect(await s.estadoAut()).toBe('CRUZANDO');
    expect(barrera(s).map((m: any) => m.accion)).toEqual(['abrir', 'cerrar']);
    await s.avanzar(3000);
    expect(await s.estadoAut()).toBe('FINALIZADA');
    expect(s.estado.snapshot().p01Ocupado).toBe(true);
    expect((await s.acceso()).estado).toBe('DENTRO');
    expect((await pool.query("SELECT estado FROM espacios WHERE codigo='P01'")).rows[0].estado).toBe('OCUPADO');
    expect(await s.eventos('ENTRADA_REGISTRADA')).toHaveLength(1);
    expect(s.flujo.autorizacionActiva()).toBeNull();
  });
  it('un segundo vehículo recibe otro puesto y el estado lista cada ocupante', async () => {
    await entrarCompleto(s);
    const b = await crearAprendiz(pool, { cedula: '2', nombre: 'Ana Gómez' });
    const v2 = await crearVehiculo(pool, b.id, { placa: 'MOT12A', tipo: 'MOTO' });
    const deps = { pool, reloj: s.reloj, estado: s.estado, vigenciaQrSeg: 60 };
    const r = await crearAutorizacion(deps, { aprendizId: b.id, vehiculoId: v2.id, direccion: 'ENTRADA' });
    if (!r.ok) throw new Error(r.motivo);
    const c = await consumirToken(deps, r.token);
    if (!c.ok) throw new Error(c.motivo);
    await s.flujo.alConfirmarToken(c.autorizacion.id);
    await s.hw({ tipo: 'entrada', presente: true });
    const cmd = barrera(s).at(-1).cmd_id;
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: cmd });
    await s.hw({ tipo: 'cruce' });
    await s.avanzar(3000);
    expect((await pool.query("SELECT codigo FROM espacios e JOIN accesos a ON a.espacio_id=e.id WHERE a.vehiculo_id=$1", [v2.id])).rows[0].codigo).toBe('P02');
    const lista = await s.flujo.listarEspacios();
    expect(lista.map((e) => e.codigo)).toEqual(['P01', 'P02', 'P03', 'P04', 'P05', 'P06']);
    expect(lista[0]).toMatchObject({ ocupado: true, placa: 'ABC123', tipo: 'CARRO', aprendiz: 'Fabio Zorro' });
    expect(lista[1]).toMatchObject({ ocupado: true, placa: 'MOT12A', tipo: 'MOTO' });
    expect(lista[2]).toMatchObject({ ocupado: false, placa: null });
  });
  it('no publica abrir mientras no haya vehículo en la entrada', async () => {
    await s.autorizar();
    expect(barrera(s)).toHaveLength(0);
    expect(s.flujo.autorizacionActiva()).toMatchObject({ estado: 'ESPERANDO_VEHICULO', direccion: 'ENTRADA', aprendiz: 'Fabio Zorro', placa: 'ABC123', tipo: 'CARRO' });
  });
  it('con el vehículo ya presente al confirmar abre de inmediato', async () => {
    await s.hw({ tipo: 'entrada', presente: true });
    await s.autorizar();
    expect(await s.estadoAut()).toBe('AUTORIZADA');
    expect(barrera(s)).toHaveLength(1);
  });
  it('sin vehículo a los 30 s la autorización queda TIEMPO_AGOTADO y no se abrió nada', async () => {
    await s.autorizar();
    await s.avanzar(30000);
    expect(await s.estadoAut()).toBe('TIEMPO_AGOTADO');
    expect(barrera(s)).toHaveLength(0);
    expect(await s.eventos('AUTORIZADO_SIN_VEHICULO')).toHaveLength(1);
    expect(s.flujo.autorizacionActiva()).toBeNull();
  });
  it('sin cruce a los 15 s publica cerrar y anula el acceso', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' });
    await s.avanzar(15000);
    expect(barrera(s).map((m: any) => m.accion)).toEqual(['abrir', 'cerrar']);
    expect((await s.acceso()).estado).toBe('ANULADO');
    expect(await s.estadoAut()).toBe('TIEMPO_AGOTADO');
    expect(await s.eventos('VEHICULO_NO_CRUZO')).toHaveLength(1);
  });
  it('al cruzar ya cuenta como entrada: queda CRUZANDO y P01 sigue libre hasta que pasan 3 s', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' }); await s.hw({ tipo: 'cruce' });
    expect(await s.estadoAut()).toBe('CRUZANDO');
    expect((await pool.query("SELECT estado FROM espacios WHERE codigo='P01'")).rows[0].estado).toBe('LIBRE');
    expect(s.estado.snapshot().p01Ocupado).toBeNull();
    await s.avanzar(2999);
    expect(await s.estadoAut()).toBe('CRUZANDO');
  });
  it('si publicar falla la autorización queda ERROR_MQTT y no hay acceso activo', async () => {
    await s.autorizar(); s.pub.fallar = true;
    await s.hw({ tipo: 'entrada', presente: true });
    expect(await s.estadoAut()).toBe('ERROR_MQTT');
    expect((await pool.query("SELECT count(*)::int n FROM accesos WHERE estado IN ('ENTRANDO','DENTRO','SALIENDO')")).rows[0].n).toBe(0);
    expect(s.flujo.autorizacionActiva()).toBeNull();
  });
  it('ignora una confirmación de barrera con cmd_id distinto', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'otro' });
    expect(await s.estadoAut()).toBe('AUTORIZADA');
  });
  it('ignora un cruce que llega antes de abrirse la barrera', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'cruce' });
    expect(await s.estadoAut()).toBe('AUTORIZADA');
  });
  it('los eventos de Emisor llegan en el orden de las transiciones', async () => {
    await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' }); await s.hw({ tipo: 'cruce' }); await s.avanzar(3000);
    expect(s.emisor.de('autorizacion:cambio').map((x: any) => x.estado)).toEqual(['ESPERANDO_VEHICULO', 'AUTORIZADA', 'BARRERA_ABIERTA', 'CRUZANDO', 'FINALIZADA']);
  });
  it('publica el texto de la LCD en cada transición', async () => {
    await s.autorizar();
    expect(s.pub.de('senapark/cmd/lcd').at(-1)!.payload).toEqual({ linea1: 'Fabio Zorro', linea2: 'Acerque el carro' });
  });

  describe('ritmo de la maqueta (barrera abierta un tiempo fijo)', () => {
    beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool, { BARRERA_ABIERTA_MS: '10000', ESTACIONAR_MS: '6000', CONFIRMA_P01_MS: '15000' }); });
    const abrir = async () => { await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true }); await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' }); };
    it('la barrera abre al validar el QR y sigue abierta aunque el HC-SR04 vea el cruce', async () => {
      await abrir();
      await s.hw({ tipo: 'cruce' });
      expect(await s.estadoAut()).toBe('BARRERA_ABIERTA');
      expect(barrera(s).map((m: any) => m.accion)).toEqual(['abrir']);
    });
    it('a los 10 s se cierra sola, y a los 6 s más queda DENTRO', async () => {
      await abrir();
      await s.avanzar(9999);
      expect(await s.estadoAut()).toBe('BARRERA_ABIERTA');
      await s.avanzar(1);
      expect(await s.estadoAut()).toBe('CRUZANDO');
      expect(barrera(s).map((m: any) => m.accion)).toEqual(['abrir', 'cerrar']);
      await s.avanzar(5999);
      expect((await s.acceso()).estado).toBe('ENTRANDO');
      await s.avanzar(1);
      expect((await s.acceso()).estado).toBe('DENTRO');
    });
    it('el infrarrojo confirma 15 s después de registrar la entrada', async () => {
      await abrir(); await s.avanzar(10000); await s.avanzar(6000);
      await s.hw({ tipo: 'p01', ocupado: true });
      await s.avanzar(14999);
      expect(await s.eventos('ENTRADA_CONFIRMADA')).toHaveLength(0);
      await s.avanzar(1);
      expect(await s.eventos('ENTRADA_CONFIRMADA')).toHaveLength(1);
    });
  });

  describe('P01 reservado para el hardware', () => {
    it('una entrada simulada (modo prueba con el ESP32 real) no toma P01', async () => {
      await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true, simulado: true });
      expect((await pool.query("SELECT e.codigo FROM accesos a JOIN espacios e ON e.id = a.espacio_id")).rows[0].codigo).toBe('P02');
    });
    it('una entrada del sensor real sigue yendo a P01', async () => {
      await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
      expect((await pool.query("SELECT e.codigo FROM accesos a JOIN espacios e ON e.id = a.espacio_id")).rows[0].codigo).toBe('P01');
    });
  });

  describe('verificación con el infrarrojo de P01', () => {
    const entrarSinEsperar = async () => {
      await s.autorizar(); await s.hw({ tipo: 'entrada', presente: true });
      await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: 'cmd-1' }); await s.hw({ tipo: 'cruce' }); await s.avanzar(3000);
    };
    it('si el sensor detecta el vehículo en P01 a tiempo, la entrada queda confirmada', async () => {
      await entrarSinEsperar();
      await s.hw({ tipo: 'p01', ocupado: true });
      await s.avanzar(15000);
      expect(await s.eventos('ENTRADA_CONFIRMADA')).toHaveLength(1);
      expect(await s.eventos('ENTRADA_NO_CONFIRMADA')).toHaveLength(0);
      expect(s.estado.snapshot().p01Alerta).toBeNull();
    });
    it('si el sensor no lo detecta, la entrada sigue DENTRO pero se marca la alerta', async () => {
      await entrarSinEsperar();
      await s.avanzar(15000);
      expect((await s.acceso()).estado).toBe('DENTRO');
      expect(await s.eventos('ENTRADA_NO_CONFIRMADA')).toHaveLength(1);
      expect(s.estado.snapshot().p01Alerta).toBe('ENTRADA_NO_CONFIRMADA');
    });
    it('la alerta se limpia cuando el sensor detecta el vehículo después', async () => {
      await entrarSinEsperar(); await s.avanzar(15000);
      await s.hw({ tipo: 'p01', ocupado: true });
      expect(s.estado.snapshot().p01Alerta).toBeNull();
    });
    it('un vehículo que va a otro puesto no se verifica con el sensor de P01', async () => {
      await entrarCompleto(s);
      await s.hw({ tipo: 'p01', ocupado: true });
      const b = await crearAprendiz(pool, { cedula: '2', nombre: 'Ana Gómez' });
      const v2 = await crearVehiculo(pool, b.id, { placa: 'MOT12A', tipo: 'MOTO' });
      const deps = { pool, reloj: s.reloj, estado: s.estado, vigenciaQrSeg: 60 };
      const r = await crearAutorizacion(deps, { aprendizId: b.id, vehiculoId: v2.id, direccion: 'ENTRADA' });
      if (!r.ok) throw new Error(r.motivo);
      const c = await consumirToken(deps, r.token);
      if (!c.ok) throw new Error(c.motivo);
      await s.flujo.alConfirmarToken(c.autorizacion.id);
      await s.hw({ tipo: 'entrada', presente: true });
      await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: barrera(s).at(-1).cmd_id });
      await s.hw({ tipo: 'cruce' }); await s.avanzar(3000); await s.avanzar(15000);
      expect(await s.eventos('ENTRADA_NO_CONFIRMADA')).toHaveLength(0);
    });
    it('en la salida, si el sensor sigue viendo el vehículo se marca SALIDA_NO_CONFIRMADA', async () => {
      await entrarCompleto(s);
      await s.hw({ tipo: 'p01', ocupado: true });
      await s.autorizar('SALIDA');
      await s.hw({ tipo: 'entrada', presente: true });
      await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: barrera(s).at(-1).cmd_id });
      await s.hw({ tipo: 'cruce' }); await s.avanzar(3000); await s.avanzar(15000);
      expect(await s.eventos('SALIDA_NO_CONFIRMADA')).toHaveLength(1);
    });
    it('en la salida, si el sensor queda libre no hay alerta', async () => {
      await entrarCompleto(s);
      await s.hw({ tipo: 'p01', ocupado: true });
      await s.autorizar('SALIDA');
      await s.hw({ tipo: 'entrada', presente: true });
      await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: barrera(s).at(-1).cmd_id });
      await s.hw({ tipo: 'cruce' }); await s.hw({ tipo: 'p01', ocupado: false }); await s.avanzar(3000); await s.avanzar(15000);
      expect(await s.eventos('SALIDA_NO_CONFIRMADA')).toHaveLength(0);
    });
  });
});
