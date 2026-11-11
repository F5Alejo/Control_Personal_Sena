import net from 'node:net';
import os from 'node:os';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarBrokerDev } from '../../src/mqtt/broker-dev.js';
import { conectarMqtt, type ClienteMqtt } from '../../src/mqtt/cliente.js';
import { enlazarHardware } from '../../src/mqtt/enlace.js';
import { EstadoHardware } from '../../src/hardware/estado.js';

let broker: { cerrar(): Promise<void> }; let backend: ClienteMqtt; let esp: ClienteMqtt;
const estado = new EstadoHardware(); const invalidos: string[] = [];
const PUERTO = 18831;
const espera = (f: () => boolean) => new Promise<void>((ok, ko) => {
  const t0 = Date.now(); const i = setInterval(() => { if (f()) { clearInterval(i); ok(); } else if (Date.now() - t0 > 3000) { clearInterval(i); ko(new Error('timeout')); } }, 20);
});

beforeAll(async () => {
  broker = await iniciarBrokerDev(PUERTO);
  backend = await conectarMqtt({ url: `mqtt://localhost:${PUERTO}`, clientId: 'test-backend' });
  esp = await conectarMqtt({ url: `mqtt://localhost:${PUERTO}`, clientId: 'test-esp' });
  await enlazarHardware(backend, estado, (t, m) => invalidos.push(`${t}:${m}`));
});
afterAll(async () => { await esp.cerrar(); await backend.cerrar(); await broker.cerrar(); });

describe('enlace MQTT', () => {
  it('un mensaje publicado en senapark/sensores/p01 actualiza el estado', async () => {
    await esp.publicar('senapark/sensores/p01', { ocupado: true, distancia_cm: 5 });
    await espera(() => estado.snapshot().p01Ocupado === true);
  });
  it('un JSON roto llama a alInvalido y no detiene mensajes siguientes', async () => {
    await esp.publicar('senapark/sensores/entrada', '{roto');
    await espera(() => invalidos.length === 1);
    await esp.publicar('senapark/sensores/entrada', { presente: true });
    await espera(() => estado.snapshot().vehiculoEnEntrada === true);
  });
  it('publicar falla si el cliente está desconectado', async () => {
    const c = await conectarMqtt({ url: `mqtt://localhost:${PUERTO}`, clientId: 'test-x' });
    await c.cerrar();
    await expect(c.publicar('senapark/cmd/lcd', {})).rejects.toThrow('MQTT desconectado');
  });
  it('el broker de desarrollo no acepta conexiones desde la LAN (solo loopback)', async () => {
    const ipLan = Object.values(os.networkInterfaces()).flat().find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
    if (!ipLan) return; // sin interfaz de red externa no hay nada que comprobar
    const conectado = await new Promise<boolean>((ok) => {
      const s = net.connect(PUERTO, ipLan);
      s.once('connect', () => { s.destroy(); ok(true); });
      s.once('error', () => ok(false));
    });
    expect(conectado).toBe(false);
  });
});
