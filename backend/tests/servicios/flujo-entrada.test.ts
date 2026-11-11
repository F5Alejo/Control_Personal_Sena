import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { montarFlujo } from './ayudas-flujo.js';

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
});
