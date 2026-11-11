import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cargarConfig } from '../../src/config/env.js';
import { crearApp } from '../../src/app.js';
import { EstadoHardware } from '../../src/hardware/estado.js';
import { iniciarBrokerDev } from '../../src/mqtt/broker-dev.js';
import { conectarMqtt, type ClienteMqtt } from '../../src/mqtt/cliente.js';
import { enlazarHardware } from '../../src/mqtt/enlace.js';
import { crearEsp32Simulado, type Esp32Simulado } from '../../src/simulador/esp32-simulado.js';
import { FlujoAcceso } from '../../src/servicios/flujo-acceso.js';
import { crearPoolPrueba, limpiarTablas, prepararBd } from '../ayudas/bd.js';
import { EmisorFalso, RelojFalso, TemporizadorManual } from '../ayudas/falsos.js';

const PUERTO = 18833; const url = `mqtt://localhost:${PUERTO}`;
const pool = crearPoolPrueba();
let broker: { cerrar(): Promise<void> }; let backend: ClienteMqtt; let esp: Esp32Simulado;
let estado: EstadoHardware; let flujo: FlujoAcceso; let reloj: RelojFalso; let temp: TemporizadorManual;
let app: ReturnType<typeof crearApp>;
const config = cargarConfig({ PUBLIC_URL: 'http://192.168.1.10:3000', BARRERA_ABIERTA_MS: '0' } as NodeJS.ProcessEnv);

const espera = (f: () => boolean | Promise<boolean>, ms = 4000) => new Promise<void>((ok, ko) => {
  const t0 = Date.now();
  const paso = async () => {
    try { if (await f()) return ok(); } catch { /* reintenta */ }
    if (Date.now() - t0 > ms) return ko(new Error('timeout esperando: ' + f.toString()));
    setTimeout(paso, 25);
  };
  void paso();
});
const ultimaAut = async () => (await pool.query('SELECT estado FROM autorizaciones_qr ORDER BY id DESC LIMIT 1')).rows[0]?.estado as string | undefined;
const ultimoAcceso = async (aprendizId?: number) => (await pool.query(
  `SELECT * FROM accesos ${aprendizId ? 'WHERE aprendiz_id = ' + aprendizId : ''} ORDER BY id DESC LIMIT 1`)).rows[0];
const esperaAut = (e: string) => espera(async () => (await ultimaAut()) === e);

async function registrar(cedula: string, nombre: string, placa: string) {
  const a = (await request(app).post('/api/aprendices').send({ cedula, nombre })).body;
  const v = (await request(app).post(`/api/aprendices/${a.id}/vehiculos`).send({ placa, tipo: 'CARRO' })).body;
  return { a, v };
}
async function autorizar(a: { id: number }, v: { id: number }, direccion: 'ENTRADA' | 'SALIDA') {
  const r = await request(app).post('/api/autorizaciones').send({ aprendizId: a.id, vehiculoId: v.id, direccion });
  if (r.status !== 201) return { r, token: '' };
  const token = new URL(r.body.url).pathname.split('/').pop()!;
  return { r, token };
}
const confirmar = (token: string) => request(app).post(`/api/acceso/${token}/confirmar`).send({});

async function entrar(a: { id: number }, v: { id: number }) {
  const { r, token } = await autorizar(a, v, 'ENTRADA');
  expect(r.status).toBe(201);
  expect((await confirmar(token)).status).toBe(200);
  await esperaAut('ESPERANDO_VEHICULO');
  await esp.poner('entrada', true);
  await esperaAut('BARRERA_ABIERTA');
  await esp.poner('cruce');
  await esperaAut('CRUZANDO');
  await flujo.esperar(); temp.avanzar(config.tiempos.estacionarMs); await flujo.esperar();
  await esperaAut('FINALIZADA');
  await esp.poner('entrada', false);
  await espera(async () => (await ultimoAcceso(a.id))?.estado === 'DENTRO');
}
async function salir(a: { id: number }, v: { id: number }) {
  const { r, token } = await autorizar(a, v, 'SALIDA');
  expect(r.status).toBe(201);
  expect((await confirmar(token)).status).toBe(200);
  await esperaAut('ESPERANDO_VEHICULO');
  await esp.poner('entrada', true);
  await esperaAut('BARRERA_ABIERTA');
  await esp.poner('cruce');
  await esperaAut('CRUZANDO');
  await flujo.esperar(); temp.avanzar(config.tiempos.estacionarMs); await flujo.esperar();
  await esperaAut('FINALIZADA');
  await esp.poner('entrada', false);
  await espera(async () => (await ultimoAcceso(a.id))?.estado === 'FINALIZADO');
}

beforeAll(async () => {
  await prepararBd(pool);
  broker = await iniciarBrokerDev(PUERTO);
  backend = await conectarMqtt({ url, clientId: 'integral-backend' });
  estado = new EstadoHardware();
  await enlazarHardware(backend, estado, () => {});
  esp = await crearEsp32Simulado({ url, clientId: 'integral-esp' });
});
afterAll(async () => { await esp.cerrar(); await backend.cerrar(); await broker.cerrar(); await pool.end(); });

beforeEach(async () => {
  await limpiarTablas(pool);
  for (const e of ['online', 'entrada', 'cruce', 'barrera', 'manual']) estado.removeAllListeners(e); // flujos de pruebas anteriores
  reloj = new RelojFalso(); temp = new TemporizadorManual();
  flujo = new FlujoAcceso({ pool, reloj, estado, publicador: backend, emisor: new EmisorFalso(), temporizador: temp, tiempos: config.tiempos });
  flujo.iniciar();
  app = crearApp({ pool, reloj, config, emisor: new EmisorFalso(), publicador: backend, temporizador: temp, estado, flujo });
  await esp.conectar();
  await esp.poner('entrada', false);
  await espera(() => estado.snapshot().esp32Online && !estado.snapshot().vehiculoEnEntrada);
});

describe('prueba integral (broker real, BD real, ESP32 simulado)', () => {
  it('entrada y salida completas dejan un acceso FINALIZADO con permanencia calculada', async () => {
    const { a, v } = await registrar('1000000001', 'Fabio Zorro', 'ABC123');
    await entrar(a, v);
    reloj.avanzar((2 * 60 + 15) * 60 * 1000);
    await salir(a, v);
    const acc = await ultimoAcceso(a.id);
    expect(acc.estado).toBe('FINALIZADO');
    const ev = (await pool.query("SELECT detalle FROM eventos WHERE tipo='SALIDA_REGISTRADA'")).rows;
    expect(ev).toHaveLength(1);
    expect(ev[0].detalle.permanencia_seg).toBe(8100);
  });

  it('un segundo aprendiz entra en otro puesto mientras P01 está ocupado', async () => {
    const f = await registrar('1000000001', 'Fabio Zorro', 'ABC123');
    const o = await registrar('1000000002', 'Ana Gómez', 'XYZ987');
    await entrar(f.a, f.v);
    const { r } = await autorizar(o.a, o.v, 'ENTRADA');
    expect(r.status).toBe(201);
  });

  it('entrada sin carrito en la barrera no abre y expira', async () => {
    const { a, v } = await registrar('1000000001', 'Fabio Zorro', 'ABC123');
    const { token } = await autorizar(a, v, 'ENTRADA');
    await confirmar(token);
    await esperaAut('ESPERANDO_VEHICULO');
    temp.avanzar(config.tiempos.esperaVehiculoMs + 1);
    await flujo.esperar();
    await esperaAut('TIEMPO_AGOTADO');
    expect(await ultimoAcceso(a.id)).toBeUndefined(); // sin vehículo nunca se crea el acceso
    expect(await pool.query("SELECT 1 FROM eventos WHERE tipo='AUTORIZADO_SIN_VEHICULO'").then(r => r.rowCount)).toBe(1);
    expect(estado.snapshot().barrera).not.toBe('abierta');
  });

  it('el mismo QR no sirve dos veces', async () => {
    const { a, v } = await registrar('1000000001', 'Fabio Zorro', 'ABC123');
    const { token } = await autorizar(a, v, 'ENTRADA');
    expect((await confirmar(token)).status).toBe(200);
    const otra = await confirmar(token);
    expect(otra.status).toBe(410);
    expect(otra.body.motivo).toBe('TOKEN_USADO');
  });

  it('tres ciclos entrada-salida seguidos con reiniciarDemo en medio funcionan sin tocar la BD', async () => {
    const { a, v } = await registrar('1000000001', 'Fabio Zorro', 'ABC123');
    for (let i = 0; i < 3; i++) {
      await entrar(a, v);
      await salir(a, v);
      expect((await request(app).post('/api/demo/reiniciar')).status).toBe(204);
    }
    const n = (await pool.query("SELECT count(*)::int AS n FROM accesos WHERE estado = 'FINALIZADO'")).rows[0].n;
    expect(n).toBe(3);
  });
});
