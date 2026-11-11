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
    await s.avanzar(3000);
    const a = await s.acceso();
    expect(a.estado).toBe('FINALIZADO');
    expect(a.salida_en).not.toBeNull();
    expect(await s.estadoAut()).toBe('FINALIZADA');
    expect((await pool.query("SELECT estado FROM espacios WHERE codigo='P01'")).rows[0].estado).toBe('LIBRE');
    expect(s.estado.snapshot().p01Ocupado).toBe(false);
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
  it('un acceso SALIENDO (salida sin cruce) puede reintentar la salida', async () => {
    await s.autorizar('SALIDA'); await s.hw({ tipo: 'entrada', presente: true });
    await s.avanzar(15000);
    await s.hw({ tipo: 'entrada', presente: false });
    await abrirSalida();
    expect(await s.estadoAut()).toBe('CRUZANDO');
    await s.avanzar(3000);
    expect((await s.acceso()).estado).toBe('FINALIZADO');
  });
  it('tras finalizar la salida el vehículo puede volver a entrar', async () => {
    await abrirSalida(); await s.avanzar(3000); await s.hw({ tipo: 'entrada', presente: false });
    await entrarCompleto(s);
    expect((await s.acceso()).estado).toBe('DENTRO');
  });
});
