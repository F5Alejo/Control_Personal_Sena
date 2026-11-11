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
  it('poner p01 publica ocupado con distancia y cruce emite el evento de cruce', async () => {
    let cruces = 0; estado.on('cruce', () => cruces++);
    await esp.poner('p01', true); await esp.poner('cruce');
    await espera(() => estado.snapshot().p01Ocupado === true && cruces === 1);
    await esp.poner('p01', false);
    await espera(() => estado.snapshot().p01Ocupado === false);
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
  const fake = () => { const llamadas: unknown[][] = []; return { llamadas, sim: { poner: async (...a: unknown[]) => { llamadas.push(a); } } as unknown as Esp32Simulado }; };
  it('responde 404 si modoSimulado es false', async () => {
    const { sim } = fake();
    const r = await request(appPrueba(pool, { simulador: sim })).post('/api/simulador/sensor').send({ sensor: 'entrada', valor: true });
    expect(r.status).toBe(404);
  });
  it('con modoSimulado responde 204, valida el sensor y llama al simulador', async () => {
    const { sim, llamadas } = fake();
    const app = appPrueba(pool, { simulador: sim, config: cargarConfig({ MODO_SIMULADO: 'true' } as NodeJS.ProcessEnv) });
    expect((await request(app).post('/api/simulador/sensor').send({ sensor: 'p01', valor: true })).status).toBe(204);
    expect(llamadas).toEqual([['p01', true]]);
    expect((await request(app).post('/api/simulador/sensor').send({ sensor: 'laser' })).status).toBe(400);
  });
});
