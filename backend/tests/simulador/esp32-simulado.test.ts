import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cargarConfig } from '../../src/config/env.js';
import { EstadoHardware } from '../../src/hardware/estado.js';
import { iniciarBrokerDev } from '../../src/mqtt/broker-dev.js';
import { conectarMqtt, type ClienteMqtt } from '../../src/mqtt/cliente.js';
import { enlazarHardware } from '../../src/mqtt/enlace.js';
import { crearEsp32Simulado, type Esp32Simulado } from '../../src/simulador/esp32-simulado.js';
import { appPrueba } from '../ayudas/app.js';
import { crearPoolPrueba } from '../ayudas/bd.js';

const PUERTO = 18832; const url = `mqtt://localhost:${PUERTO}`;
let broker: { cerrar(): Promise<void> }; let backend: ClienteMqtt; let esp: Esp32Simulado;
const estado = new EstadoHardware(); const barreras: { estado: string; cmdId?: string }[] = [];
const pool = crearPoolPrueba();
const espera = (f: () => boolean, ms = 3000) => new Promise<void>((ok, ko) => {
  const t0 = Date.now(); const i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > ms) { clearInterval(i); ko(new Error('timeout')); } }, 20);
});
const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

beforeAll(async () => {
  broker = await iniciarBrokerDev(PUERTO);
  backend = await conectarMqtt({ url, clientId: 'sim-backend' });
  estado.on('barrera', (b) => barreras.push(b));
  await enlazarHardware(backend, estado, () => {});
  esp = await crearEsp32Simulado({ url, clientId: 'sim-esp' });
});
afterAll(async () => { await esp.cerrar(); await backend.cerrar(); await broker.cerrar(); await pool.end(); });

describe('ESP32 simulado', () => {
  it('al conectar el simulador, EstadoHardware queda online', async () => {
    await esp.conectar();
    await espera(() => estado.snapshot().esp32Online);
  });
  it('poner entrada true actualiza vehiculoEnEntrada', async () => {
    await esp.poner('entrada', true);
    await espera(() => estado.snapshot().vehiculoEnEntrada);
  });
  it('poner entrada publica también la distancia del HC-SR04', async () => {
    await esp.poner('entrada', true);
    await espera(() => estado.snapshot().distanciaCm === 12);
    await esp.poner('entrada', false);
    await espera(() => estado.snapshot().distanciaCm === 85 && !estado.snapshot().vehiculoEnEntrada);
  });
  it('acercar publica una distancia y la presencia sale del umbral', async () => {
    await esp.acercar(60);
    await espera(() => estado.snapshot().distanciaCm === 60 && !estado.snapshot().vehiculoEnEntrada);
    await esp.acercar(18);
    await espera(() => estado.snapshot().distanciaCm === 18 && estado.snapshot().vehiculoEnEntrada);
  });
  it('poner p01 publica la lectura del infrarrojo de P01', async () => {
    await esp.poner('p01', true);
    await espera(() => estado.snapshot().p01Sensor === true);
    await esp.poner('p01', false);
    await espera(() => estado.snapshot().p01Sensor === false);
  });
  it('cruce emite el evento de cruce', async () => {
    let cruces = 0; estado.on('cruce', () => cruces++);
    await esp.poner('cruce');
    await espera(() => cruces === 1);
  });
  it('publica telemetría al conectar', async () => {
    await esp.conectar();
    await espera(() => estado.snapshot().telemetria !== null);
    expect(estado.snapshot().telemetria).toMatchObject({ rssi: -55 });
  });
  it('un comando abrir recibido produce barrera abierta con el mismo cmd_id', async () => {
    await backend.publicar('senapark/cmd/barrera', { cmd_id: 'c1', accion: 'abrir', expira_en_ms: 5000 });
    await espera(() => barreras.some((b) => b.estado === 'abierta' && b.cmdId === 'c1'));
    await backend.publicar('senapark/cmd/barrera', { cmd_id: 'c2', accion: 'cerrar', expira_en_ms: 5000 });
    await espera(() => barreras.some((b) => b.estado === 'cerrada' && b.cmdId === 'c2'));
  });
  it('un comando abrir vencido se ignora', async () => {
    const antes = barreras.length;
    await backend.publicar('senapark/cmd/barrera', { cmd_id: 'viejo', accion: 'abrir', expira_en_ms: 0 });
    await pausa(300);
    expect(barreras.slice(antes)).toEqual([]);
  });
  it('desconectar deja esp32Online en false y conectar lo vuelve a poner online', async () => {
    await esp.desconectar();
    await espera(() => !estado.snapshot().esp32Online);
    await esp.conectar();
    await espera(() => estado.snapshot().esp32Online);
  });
});

describe('ruta del simulador', () => {
  const fake = () => { const llamadas: unknown[][] = []; return { llamadas, sim: { poner: async (...a: unknown[]) => { llamadas.push(a); }, acercar: async (cm: number) => { llamadas.push(['distancia', cm]); } } as unknown as Esp32Simulado }; };
  it('responde 404 si no hay simulador', async () => {
    const r = await request(appPrueba(pool)).post('/api/simulador/sensor').send({ sensor: 'entrada', valor: true });
    expect(r.status).toBe(404);
  });
  it('con modoSimulado responde 204, valida el sensor y llama al simulador', async () => {
    const { sim, llamadas } = fake();
    const app = appPrueba(pool, { simulador: sim, config: cargarConfig({ MODO_SIMULADO: 'true' } as NodeJS.ProcessEnv) });
    expect((await request(app).post('/api/simulador/sensor').send({ sensor: 'cruce' })).status).toBe(204);
    expect(llamadas).toEqual([['cruce', undefined]]);
    expect((await request(app).post('/api/simulador/distancia').send({ distancia_cm: 35 })).status).toBe(204);
    expect(llamadas.at(-1)).toEqual(['distancia', 35]);
    expect((await request(app).post('/api/simulador/distancia').send({ distancia_cm: -4 })).status).toBe(400);
    expect((await request(app).post('/api/simulador/sensor').send({ sensor: 'p01', valor: true })).status).toBe(204);
    expect(llamadas.at(-1)).toEqual(['p01', true]);
    expect((await request(app).post('/api/simulador/sensor').send({ sensor: 'laser' })).status).toBe(400);
  });
});

describe('ESP32 simulado solo de sensores (con el ESP32 real conectado)', () => {
  it('no toca el estado en línea, no responde a la barrera y sí publica la distancia', async () => {
    await esp.desconectar();
    const e2 = new EstadoHardware(); const bs: unknown[] = [];
    const b2 = await conectarMqtt({ url, clientId: 'sim-backend-2' });
    e2.on('barrera', (b) => bs.push(b));
    await enlazarHardware(b2, e2, () => {});
    const solo = await crearEsp32Simulado({ url, clientId: 'sim-solo' }, { soloSensores: true });
    await solo.conectar();
    await pausa(150);
    expect(e2.snapshot().esp32Online).toBe(false);
    await solo.poner('online', true);
    await solo.acercar(10);
    await espera(() => e2.snapshot().vehiculoEnEntrada);
    expect(e2.snapshot().distanciaCm).toBe(10);
    await b2.publicar('senapark/cmd/barrera', { cmd_id: 'x', accion: 'abrir', expira_en_ms: 5000 });
    await pausa(200);
    expect(bs).toHaveLength(0);
    expect(e2.snapshot().esp32Online).toBe(false);
    await solo.cerrar(); await b2.cerrar(); await esp.conectar();
  });
});
