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
  it('P01 lo fija el backend: emite cambio y no un evento de sensor', () => {
    const e = new EstadoHardware(); const c: unknown[] = [];
    e.on('cambio', (s) => c.push(s));
    expect(e.snapshot().p01Ocupado).toBeNull();
    e.fijarP01(true); e.fijarP01(true); e.fijarP01(false);
    expect(c).toHaveLength(2);
    expect(e.snapshot().p01Ocupado).toBe(false);
  });
  it('guarda la distancia del HC-SR04 aunque no cambie la presencia', () => {
    const e = new EstadoHardware(); const pres: boolean[] = []; let cambios = 0;
    e.on('entrada', (x) => pres.push(x)); e.on('cambio', () => cambios++);
    e.aplicar({ tipo: 'entrada', presente: false, distanciaCm: 80 });
    e.aplicar({ tipo: 'entrada', presente: false, distanciaCm: 55 });
    e.aplicar({ tipo: 'entrada', presente: true, distanciaCm: 12 });
    expect(e.snapshot().distanciaCm).toBe(12);
    expect(pres).toEqual([true]);
    expect(cambios).toBe(3);
  });
  it('una lectura sin cambios no repite el cambio', () => {
    const e = new EstadoHardware(); let cambios = 0; e.on('cambio', () => cambios++);
    e.aplicar({ tipo: 'entrada', presente: false, distanciaCm: 80 });
    e.aplicar({ tipo: 'entrada', presente: false, distanciaCm: 80 });
    expect(cambios).toBe(1);
  });
  it('la telemetría queda en el snapshot y offline la borra junto con la distancia', () => {
    const e = new EstadoHardware();
    e.aplicar({ tipo: 'online', valor: true });
    e.aplicar({ tipo: 'telemetria', rssi: -60, uptimeS: 30, ip: '192.168.1.40' });
    expect(e.snapshot().telemetria).toMatchObject({ rssi: -60, uptimeS: 30, ip: '192.168.1.40' });
    e.aplicar({ tipo: 'entrada', presente: true, distanciaCm: 9 });
    e.aplicar({ tipo: 'online', valor: false });
    expect(e.snapshot().telemetria).toBeNull();
    expect(e.snapshot().distanciaCm).toBeNull();
    expect(e.snapshot().vehiculoEnEntrada).toBe(false);
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
