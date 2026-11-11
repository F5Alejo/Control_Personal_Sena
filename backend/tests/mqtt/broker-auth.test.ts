import mqtt from 'mqtt';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { iniciarBrokerDev } from '../../src/mqtt/broker-dev.js';

const PUERTO = 18853;
let broker: Awaited<ReturnType<typeof iniciarBrokerDev>>;
beforeAll(async () => { broker = await iniciarBrokerDev(PUERTO, { usuario: 'esp32', clave: 'secreta' }); });
afterAll(() => broker.cerrar());

const conectar = (opts: mqtt.IClientOptions) => new Promise<'ok' | 'rechazado'>((res) => {
  const c = mqtt.connect(`mqtt://127.0.0.1:${PUERTO}`, { reconnectPeriod: 0, connectTimeout: 3000, ...opts });
  c.once('connect', () => { c.end(true); res('ok'); });
  c.once('error', () => { c.end(true); res('rechazado'); });
});

describe('broker con autenticación', () => {
  it('rechaza a un cliente sin credenciales o con clave errónea', async () => {
    expect(await conectar({})).toBe('rechazado');
    expect(await conectar({ username: 'esp32', password: 'mala' })).toBe('rechazado');
  });
  it('acepta al cliente con las credenciales correctas', async () => {
    expect(await conectar({ username: 'esp32', password: 'secreta' })).toBe('ok');
  });
});
