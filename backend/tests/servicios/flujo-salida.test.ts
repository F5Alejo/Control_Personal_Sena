import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { entrarCompleto, montarFlujo, type Montaje } from './ayudas-flujo.js';

const pool = crearPoolPrueba();
let s: Montaje;
beforeAll(() => prepararBd(pool));
afterAll(() => pool.end());
beforeEach(async () => { await limpiarTablas(pool); s = await montarFlujo(pool); await entrarCompleto(s); });

const abrirSalida = async () => {
  await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
  const cmd = s.pub.de('senapark/cmd/barrera').at(-1)!.payload.cmd_id;
  await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: cmd });
  await s.hw({ tipo: 'cruce' });
};

describe('flujo de salida', () => {
  it('camino feliz de salida deja FINALIZADO, P01 LIBRE y calcula la permanencia', async () => {
    s.reloj.avanzar((2 * 60 + 15) * 60 * 1000);
    await abrirSalida();
    expect((await s.acceso()).estado).toBe('SALIENDO');
    await s.hw({ tipo: 'p01', ocupado: false });
    const a = await s.acceso();
    expect(a.estado).toBe('FINALIZADO');
    expect(a.salida_en).not.toBeNull();
    expect(await s.estadoAut()).toBe('FINALIZADA');
    expect((await pool.query("SELECT estado FROM espacios WHERE codigo='P01'")).rows[0].estado).toBe('LIBRE');
    const ev = await s.eventos('SALIDA_REGISTRADA');
    expect(ev).toHaveLength(1);
    expect(ev[0].detalle.permanencia_seg).toBe(8100);
  });
  it('sin cruce vuelve el acceso a DENTRO', async () => {
    await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
    await s.avanzar(15000);
    expect((await s.acceso()).estado).toBe('DENTRO');
    expect(await s.estadoAut()).toBe('TIEMPO_AGOTADO');
    expect(await s.eventos('VEHICULO_NO_CRUZO')).toHaveLength(1);
  });
  it('P01 que sigue ocupado deja SALIENDO y registra SALIDA_SIN_LIBERAR', async () => {
    await abrirSalida();
    await s.avanzar(30000);
    expect((await s.acceso()).estado).toBe('SALIENDO');
    expect(await s.eventos('SALIDA_SIN_LIBERAR')).toHaveLength(1);
    expect(await s.estadoAut()).toBe('TIEMPO_AGOTADO');
  });
  it('un acceso SALIENDO puede reintentar la salida', async () => {
    await abrirSalida(); await s.avanzar(30000);
    await s.hw({ tipo: 'entrada', presente: false });
    await abrirSalida().catch(() => {});
    expect(await s.estadoAut()).toBe('CRUZANDO');
    await s.hw({ tipo: 'p01', ocupado: false });
    expect((await s.acceso()).estado).toBe('FINALIZADO');
  });
  it('tras finalizar la salida el vehículo puede volver a entrar', async () => {
    await abrirSalida(); await s.hw({ tipo: 'p01', ocupado: false }); await s.hw({ tipo: 'entrada', presente: false });
    await entrarCompleto(s);
    expect((await s.acceso()).estado).toBe('DENTRO');
  });
  it('P01 que se libera antes del cruce igual finaliza la salida (nivel, no flanco)', async () => {
    await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
    const cmd = s.pub.de('senapark/cmd/barrera').at(-1)!.payload.cmd_id;
    await s.hw({ tipo: 'barrera', estado: 'abierta', cmdId: cmd });
    await s.hw({ tipo: 'p01', ocupado: false });
    expect((await s.acceso()).estado).toBe('SALIENDO');
    await s.hw({ tipo: 'cruce' });
    expect((await s.acceso()).estado).toBe('FINALIZADO');
    expect(await s.estadoAut()).toBe('FINALIZADA');
    expect(await s.eventos('P01_LIBERADO_SIN_SALIDA')).toHaveLength(0);
    expect(await s.eventos('SALIDA_REGISTRADA')).toHaveLength(1);
  });
});
