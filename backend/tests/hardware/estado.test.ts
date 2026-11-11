import { describe, expect, it } from 'vitest';
import { EstadoHardware } from '../../src/hardware/estado.js';

describe('EstadoHardware', () => {
  it("emite 'entrada' solo cuando cambia", () => {
    const e = new EstadoHardware(); const v: boolean[] = [];
    e.on('entrada', (x) => v.push(x));
    e.aplicar({ tipo: 'entrada', presente: true });
    e.aplicar({ tipo: 'entrada', presente: true });
    e.aplicar({ tipo: 'entrada', presente: false });
    expect(v).toEqual([true, false]);
  });
  it('cruce siempre emite', () => {
    const e = new EstadoHardware(); let n = 0;
    e.on('cruce', () => n++);
    e.aplicar({ tipo: 'cruce' }); e.aplicar({ tipo: 'cruce' });
    expect(n).toBe(2);
  });
  it('snapshot refleja el último p01', () => {
    const e = new EstadoHardware();
    expect(e.snapshot().p01Ocupado).toBeNull();
    e.aplicar({ tipo: 'p01', ocupado: true });
    expect(e.snapshot().p01Ocupado).toBe(true);
    e.aplicar({ tipo: 'p01', ocupado: false });
    expect(e.snapshot().p01Ocupado).toBe(false);
  });
  it('offline deja esp32Online en false', () => {
    const e = new EstadoHardware();
    e.aplicar({ tipo: 'online', valor: true });
    expect(e.snapshot().esp32Online).toBe(true);
    e.aplicar({ tipo: 'online', valor: false });
    expect(e.snapshot().esp32Online).toBe(false);
  });
  it("emite 'cambio' con snapshot en cada cambio y 'barrera' con cmdId", () => {
    const e = new EstadoHardware(); const snaps: unknown[] = []; const b: unknown[] = [];
    e.on('cambio', (s) => snaps.push(s)); e.on('barrera', (x) => b.push(x));
    e.aplicar({ tipo: 'barrera', estado: 'abierta', cmdId: 'c1' });
    expect(snaps).toHaveLength(1);
    expect(b).toEqual([{ estado: 'abierta', cmdId: 'c1' }]);
    expect(e.snapshot().barrera).toBe('abierta');
  });
  it('manual emite solicitud', () => {
    const e = new EstadoHardware(); const m: unknown[] = [];
    e.on('manual', (x) => m.push(x));
    e.aplicar({ tipo: 'manual', solicitud: 'apertura' });
    expect(m).toEqual([{ solicitud: 'apertura' }]);
  });
});
